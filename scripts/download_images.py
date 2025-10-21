import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = PROJECT_ROOT / "src" / "data" / "drug-data.json"
DEFAULT_OUTPUT = PROJECT_ROOT / "public" / "drug-images"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

WIKIPEDIA_ENDPOINTS = {
    "zh": "https://zh.wikipedia.org/w/api.php",
    "en": "https://en.wikipedia.org/w/api.php",
}
WIKIPEDIA_THUMB_SIZE = 600


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value)
    return value.strip("-") or "item"


def looks_like_placeholder(image_value: str) -> bool:
    return image_value.startswith("data:image")


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def parse_data_uri(uri: str) -> tuple[bytes, str]:
    header, b64_data = uri.split(",", 1)
    mime_match = re.search(r"data:([^;]+);base64", header)
    if not mime_match:
        raise ValueError("无法解析 data URI 的 MIME 类型")
    mime_type = mime_match.group(1)
    ext = mimetypes.guess_extension(mime_type) or ".bin"
    payload = base64.b64decode(b64_data)
    return payload, ext


def download_http(url: str) -> tuple[bytes, str]:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=20) as resp:
        content_type = resp.headers.get("Content-Type", "").split(";")[0].strip()
        if content_type and not content_type.startswith("image/"):
            raise ValueError(f"目标返回的 Content-Type={content_type}，不是图片")
        ext = mimetypes.guess_extension(content_type) or guess_extension_from_url(url)
        data = resp.read()
    return data, ext


def guess_extension_from_url(url: str) -> str:
    path = urlparse(url).path
    ext = os.path.splitext(path)[1]
    return ext if ext else ".bin"


def wikipedia_search(query: str, lang: str) -> str | None:
    endpoint = WIKIPEDIA_ENDPOINTS[lang]
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages",
        "generator": "search",
        "gsrsearch": query,
        "gsrlimit": "1",
        "piprop": "thumbnail|original",
        "pithumbsize": str(WIKIPEDIA_THUMB_SIZE),
    }
    req = Request(f"{endpoint}?{urlencode(params)}", headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=12) as resp:
        payload = json.load(resp)

    pages = payload.get("query", {}).get("pages", {})
    for page in pages.values():
        original = page.get("original", {}).get("source")
        if isinstance(original, str):
            return original
        thumb = page.get("thumbnail", {}).get("source")
        if isinstance(thumb, str):
            return thumb
    return None


def find_external_image(brand: str, generic: str) -> str | None:
    queries = [brand, generic, f"{brand} 药品 包装", f"{generic} 药品 包装"]
    tried = set()
    for query in filter(None, queries):
        q = query.strip()
        if not q or q in tried:
            continue
        tried.add(q)
        for lang in ("zh", "en"):
            try:
                result = wikipedia_search(q, lang)
                if result:
                    return result
            except Exception as error:  # noqa: BLE001
                print(f"[提示] 维基百科检索失败（{q}/{lang}）：{error}", file=sys.stderr)
    return None


def iterate_items(dataset: dict, names_filter: set[str] | None = None):
    for category in dataset.get("categories", []):
        for item in category.get("items", []):
            name = item.get("brandName", "")
            if names_filter and name not in names_filter:
                continue
            yield item


def main():
    parser = argparse.ArgumentParser(description="下载药品图片到项目中")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="图片保存目录（默认：public/drug-images）",
    )
    parser.add_argument(
        "--names",
        nargs="+",
        help="只下载指定商品名（空格分隔），默认全部",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="限制下载数量（调试用）",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.4,
        help="每次下载后的延迟秒数，避免触发频率限制（默认 0.4）",
    )
    args = parser.parse_args()

    if not DATA_FILE.exists():
        print(f"未找到数据文件：{DATA_FILE}", file=sys.stderr)
        sys.exit(1)

    with DATA_FILE.open("r", encoding="utf-8") as fp:
        dataset = json.load(fp)

    ensure_dir(args.output)
    names_filter = set(args.names) if args.names else None

    total = 0
    skipped = 0

    for item in iterate_items(dataset, names_filter):
        if args.limit and total >= args.limit:
            break

        brand = item.get("brandName", "未知药品")
        generic = item.get("genericName", "")
        image_value = item.get("image", "")
        resolved_source = ""
        source_label = ""

        if image_value.startswith("http"):
            resolved_source = image_value
            source_label = "dataset"
        elif image_value and not looks_like_placeholder(image_value):
            resolved_source = image_value
            source_label = "dataset"
        else:
            external = find_external_image(brand, generic)
            if external:
                resolved_source = external
                source_label = "wikipedia"
            else:
                if image_value:
                    resolved_source = image_value
                    source_label = "placeholder"

        fallback_placeholder = image_value if image_value.startswith("data:image") else ""

        if not resolved_source:
            print(f"[跳过] {brand} 没有可用图片来源")
            skipped += 1
            continue

        slug = slugify(f"{brand}-{generic}") or slugify(brand)
        output_path = args.output / slug

        attempts = []
        if resolved_source:
            attempts.append((resolved_source, source_label))
        if fallback_placeholder and fallback_placeholder != resolved_source:
            attempts.append((fallback_placeholder, "placeholder"))

        success = False
        last_error: Exception | None = None

        for candidate, label in attempts:
            try:
                if candidate.startswith("data:image"):
                    data, ext = parse_data_uri(candidate)
                elif candidate.startswith("http"):
                    data, ext = download_http(candidate)
                else:
                    raise ValueError(f"不支持的图片来源：{candidate[:30]}...")

                file_path = output_path.with_suffix(ext)
                file_path.write_bytes(data)
                note = f"[{label}]" if label else ""
                print(f"[完成] {brand} {note} -> {file_path.relative_to(PROJECT_ROOT)}")
                total += 1
                time.sleep(args.sleep)
                success = True
                break
            except Exception as error:  # noqa: BLE001
                last_error = error
                print(f"[警告] {brand} 下载失败（{label}）：{error}", file=sys.stderr)

        if not success:
            print(f"[失败] {brand}: {last_error}", file=sys.stderr)
            skipped += 1

    print(f"共处理 {total} 条，跳过 {skipped} 条。输出目录：{args.output.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
