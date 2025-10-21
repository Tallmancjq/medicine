import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW_URL = 'https://raw.githubusercontent.com/qianguyihao/original-drug-list/refs/heads/main/README.md';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const cacheDir = path.resolve(projectRoot, 'cache');
const IMAGE_CACHE_FILE = path.join(cacheDir, 'image-cache.json');
const IMAGE_CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 天
const BING_API_KEY = process.env.BING_IMAGE_KEY || process.env.BING_IMAGE_API_KEY || '';
const BING_IMAGE_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/search';
const shouldFetchImages = Boolean(BING_API_KEY);

function normalizeText(text) {
  return text.replace(/\uFEFF/g, '').trim();
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const palettes = [
  { start: '#a5c9ff', end: '#6faafc', text: '#0b1a3c' },
  { start: '#a3f3d8', end: '#5ed7b6', text: '#04382c' },
  { start: '#ffe0b5', end: '#ffb27f', text: '#5a2400' },
  { start: '#fbc2eb', end: '#a6c1ee', text: '#381452' },
  { start: '#fbe5d6', end: '#f5c4a1', text: '#4a1d07' },
  { start: '#c8e7ff', end: '#7bc2ff', text: '#05294b' },
  { start: '#e5f3ff', end: '#b8d9ff', text: '#123460' },
  { start: '#e8ffe8', end: '#b6f6c1', text: '#0f4020' },
  { start: '#fde2ff', end: '#f1c6ff', text: '#3c0f45' },
  { start: '#fff3c4', end: '#ffd47a', text: '#493107' },
];

function hashCode(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitial(brandName) {
  const trimmed = brandName.replace(/\s+/g, '');
  return trimmed.slice(0, 2) || '药';
}

function buildImageData(brandName, genericName) {
  const seed = `${brandName}-${genericName}`;
  const palette = palettes[hashCode(seed) % palettes.length];
  const initials = escapeXml(getInitial(brandName));
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.start}" />
      <stop offset="100%" stop-color="${palette.end}" />
    </linearGradient>
  </defs>
  <rect rx="28" ry="28" width="320" height="220" fill="url(#gradient)" />
  <g>
    <circle cx="80" cy="110" r="58" fill="rgba(255,255,255,0.28)" />
    <circle cx="240" cy="90" r="42" fill="rgba(255,255,255,0.22)" />
    <circle cx="230" cy="150" r="26" fill="rgba(255,255,255,0.18)" />
  </g>
  <text
    x="50%"
    y="52%"
    font-family="Noto Sans SC, 'Microsoft YaHei', Arial, sans-serif"
    font-size="74"
    font-weight="600"
    fill="${palette.text}"
    text-anchor="middle"
    dominant-baseline="middle"
  >${initials}</text>
</svg>`;
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

function buildSlug(name) {
  return normalizeText(name)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/giu, '');
}

function buildCacheKey(brandName, genericName) {
  return `${brandName}__${genericName}`.toLowerCase();
}

async function loadImageCache() {
  try {
    const raw = await readFile(IMAGE_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed));
  } catch (error) {
    return new Map();
  }
}

async function saveImageCache(cacheMap) {
  await mkdir(cacheDir, { recursive: true });
  const serializable = Object.fromEntries(cacheMap.entries());
  await writeFile(IMAGE_CACHE_FILE, JSON.stringify(serializable, null, 2), 'utf-8');
}

async function requestImageFromBing(query) {
  const url = `${BING_IMAGE_ENDPOINT}?q=${encodeURIComponent(query)}&count=1&mkt=zh-CN&safeSearch=Strict&imageType=Photo`;
  const response = await fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': BING_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Bing Image Search 请求失败：${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const firstResult = data?.value?.[0];
  if (!firstResult) {
    return null;
  }

  const contentUrl = firstResult.contentUrl || firstResult.thumbnailUrl || null;
  if (typeof contentUrl === 'string' && contentUrl.startsWith('http')) {
    return contentUrl;
  }
  return null;
}

async function fetchRealImage(brandName, genericName, cacheMap) {
  if (!shouldFetchImages) {
    return { imageUrl: null, cacheTouched: false };
  }

  const key = buildCacheKey(brandName, genericName);
  const cachedValue = cacheMap.get(key);
  if (cachedValue) {
    try {
      const parsed = JSON.parse(cachedValue);
      if (parsed.imageUrl) {
        return { imageUrl: parsed.imageUrl, cacheTouched: false };
      }
      if (parsed.fetchedAt) {
        const fetchedAt = new Date(parsed.fetchedAt).getTime();
        if (!Number.isNaN(fetchedAt) && Date.now() - fetchedAt < IMAGE_CACHE_TTL) {
          return { imageUrl: null, cacheTouched: false };
        }
      }
    } catch (error) {
      // 无法解析缓存时继续请求
    }
  }

  const query = `${brandName} ${genericName} 药品 原研`;
  try {
    const imageUrl = await requestImageFromBing(query);
    const payload = JSON.stringify({
      imageUrl,
      fetchedAt: new Date().toISOString(),
    });
    cacheMap.set(key, payload);
    // 轻微延迟，降低触发速率限制的概率
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { imageUrl, cacheTouched: true };
  } catch (error) {
    console.warn(`获取图片失败（${brandName}）：${error.message}`);
    const payload = JSON.stringify({
      imageUrl: null,
      fetchedAt: new Date().toISOString(),
    });
    cacheMap.set(key, payload);
    return { imageUrl: null, cacheTouched: true };
  }
}

function extractSummary(lines) {
  const findLine = (prefix) => lines.find((line) => normalizeText(line).startsWith(prefix));

  const totalLine = findLine('- 已收录');
  const total = totalLine ? normalizeText(totalLine).replace(/^- 已收录[约全计]*\s*/u, '').replace(/。?$/u, '') : '';

  const updatedLine = findLine('- 统计截止时间');
  const lastUpdated = updatedLine ? normalizeText(updatedLine).replace(/^- 统计截止时间：?/u, '').replace(/。?$/u, '') : '';

  const sourceLine = findLine('- 数据来源');
  const source = sourceLine ? normalizeText(sourceLine).replace(/^- 数据来源：?/u, '').replace(/。?$/u, '') : '';

  return {
    total,
    lastUpdated,
    source,
  };
}

function extractCategoryCounts(lines) {
  const map = new Map();
  const startIndex = lines.findIndex((line) => normalizeText(line).startsWith('药品分类及数量'));
  if (startIndex === -1) {
    return map;
  }

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const raw = normalizeText(lines[i]);
    if (!raw.startsWith('- ')) break;
    const match = raw.match(/^- (.+?)：\s*(\d+)/u);
    if (match) {
      const [, name, count] = match;
      map.set(name, Number.parseInt(count, 10));
    }
  }
  return map;
}

function parseTable(sectionBody) {
  const lines = sectionBody.split('\n');
  const tableLines = [];
  let collecting = false;

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      collecting = true;
      tableLines.push(line.trim());
    } else if (collecting) {
      break;
    }
  }

  if (tableLines.length < 3) {
    return [];
  }

  const dataLines = tableLines.slice(2);
  return dataLines
    .map((line) => line.trim())
    .filter((line) => line && line !== '|' && line !== '| |')
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((cell) => normalizeText(cell));
      const [brandName, genericName, manufacturerShort, manufacturerFull] = cells;
      return {
        brandName,
        genericName,
        manufacturerShort,
        manufacturerFull,
      };
    });
}

async function enrichItemsWithImages(categories, cacheMap) {
  let cacheTouched = false;

  for (const category of categories) {
    for (const item of category.items) {
      const { imageUrl, cacheTouched: touched } = await fetchRealImage(
        item.brandName,
        item.genericName,
        cacheMap,
      );
      if (touched) {
        cacheTouched = true;
      }
      if (imageUrl) {
        item.image = imageUrl;
      } else {
        item.image = buildImageData(item.brandName, item.genericName);
      }
    }
  }

  return cacheTouched;
}

async function main() {
  if (!shouldFetchImages) {
    console.warn('未检测到 Bing Image Search API Key，将继续使用占位图像。');
  }

  const response = await fetch(RAW_URL);
  if (!response.ok) {
    throw new Error(`获取 README 失败：${response.status} ${response.statusText}`);
  }

  const markdown = await response.text();
  const lines = markdown.split('\n');

  const summary = extractSummary(lines);
  const categoryCountMap = extractCategoryCounts(lines);

  const sections = markdown.split('\n## ').slice(1);
  const categories = sections.map((sectionRaw) => {
    const [headingLine, ...rest] = sectionRaw.split('\n');
    const name = normalizeText(headingLine);
    const body = rest.join('\n');
    const items = parseTable(body);

    return {
      name,
      slug: buildSlug(name),
      count: categoryCountMap.get(name) ?? items.length,
      items,
    };
  });

  const imageCache = await loadImageCache();
  const cacheUpdated = await enrichItemsWithImages(categories, imageCache);

  const payload = {
    title: normalizeText(lines[0].replace(/^#\s*/u, '')),
    summary,
    categories,
    totalCategories: categories.length,
    generatedAt: new Date().toISOString(),
    sourceUrl: RAW_URL,
  };

  const dataDir = path.resolve(projectRoot, 'src', 'data');
  await mkdir(dataDir, { recursive: true });
  const outputPath = path.join(dataDir, 'drug-data.json');
  await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
  if (cacheUpdated) {
    await saveImageCache(imageCache);
  }
  console.log(`数据已写入 ${path.relative(projectRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
