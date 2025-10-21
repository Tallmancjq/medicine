<template>
  <div class="min-h-screen bg-gradient-to-b from-white/80 via-[#f5fbff] to-[#f0fdf9] pb-16">
    <header class="mx-auto max-w-content px-4 pt-8 sm:px-6">
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/70 bg-white/80 px-6 py-4 text-sm text-neutral-600 shadow-sm backdrop-blur">
        <div class="flex items-center gap-2 font-semibold text-neutral-900">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">药</span>
          <span>原研药目录 · 数据仪表盘</span>
        </div>
        <div class="flex items-center gap-4 text-xs sm:text-sm">
          <a
            href="#"
            class="hidden items-center gap-1 text-neutral-400 transition hover:text-primary sm:inline-flex"
            @click.prevent="scrollToCategories()"
          >
            分类概览
          </a>
          <a
            :href="dataset.sourceUrl"
            target="_blank"
            rel="noreferrer noopener"
            class="inline-flex items-center gap-1 text-neutral-400 transition hover:text-primary"
          >
            数据源
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>

    <main class="space-y-16">
      <HeroSection
        :title="dataset.title"
        :summary="dataset.summary"
        :total-categories="dataset.totalCategories"
        :total-drugs="totalDrugs"
        :manufacturer-count="manufacturerCount"
        :source-url="dataset.sourceUrl"
        :stats="heroStats"
        @scroll-to-categories="scrollToCategories"
      />

      <FeaturedShowcase v-if="featuredItems.length" :items="featuredItems" />

      <CategoryNav
        v-if="dataset.categories.length"
        :categories="navCategories"
        :active-slug="activeSlug"
        @select="scrollToCategory"
        @scroll-top="scrollToTop"
      />

      <div>
        <CategorySection
          v-for="category in dataset.categories"
          :key="category.slug"
          :category="category"
        />
      </div>
    </main>

    <FooterInfo
      :summary="dataset.summary"
      :generated-at="generatedAtDisplay"
      :total-drugs="totalDrugs"
      :total-categories="dataset.totalCategories"
    />

    <transition name="fade">
      <button
        v-if="showBackToTop"
        type="button"
        class="fixed bottom-6 right-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:bg-primary-dark"
        @click="scrollToTop"
      >
        ↑
        <span class="sr-only">返回顶部</span>
      </button>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import HeroSection from './components/HeroSection.vue';
import FeaturedShowcase from './components/FeaturedShowcase.vue';
import CategoryNav from './components/CategoryNav.vue';
import CategorySection from './components/CategorySection.vue';
import FooterInfo from './components/FooterInfo.vue';
import type { DrugDataset } from './types/drug';
import rawDataset from './data/drug-data.json' with { type: 'json' };

const dataset = rawDataset as DrugDataset;

const totalDrugs = computed(() =>
  dataset.categories.reduce((sum, category) => sum + category.items.length, 0),
);

const manufacturerCount = computed(() => {
  const manufacturers = new Set<string>();
  dataset.categories.forEach((category) => {
    category.items.forEach((item) => {
      if (item.manufacturerShort && item.manufacturerShort !== '-' && item.manufacturerShort !== '—') {
        manufacturers.add(item.manufacturerShort);
      }
    });
  });
  return manufacturers.size;
});

const generatedAtDisplay = computed(() => {
  const date = new Date(dataset.generatedAt);
  return Number.isNaN(date.getTime())
    ? dataset.generatedAt
    : date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
});

const heroStats = computed(() => [
  {
    label: '已收录药品',
    value: dataset.summary.total,
    caption: `生成时间：${generatedAtDisplay.value}`,
  },
  {
    label: '覆盖分类',
    value: `${dataset.totalCategories} 个`,
    caption: '覆盖内科、外科、慢病、肿瘤等 37 个主题',
  },
  {
    label: '生产厂家',
    value: `${manufacturerCount.value} 家`,
    caption: '按厂家简称去重统计',
  },
  {
    label: '更新时间',
    value: dataset.summary.lastUpdated,
    caption: '以数据源更新时间为准',
  },
]);

const featuredItems = computed(() => {
  const firstCategory = dataset.categories.find((category) => category.slug.includes('热门'));
  return firstCategory ? firstCategory.items : (dataset.categories[0]?.items ?? []);
});

const navCategories = computed(() =>
  dataset.categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    count: category.count,
  })),
);

const activeSlug = ref(dataset.categories[0]?.slug ?? '');
const showBackToTop = ref(false);
let observer: IntersectionObserver | null = null;

function scrollToCategory(slug: string) {
  const el = document.getElementById(slug);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activeSlug.value = slug;
  }
}

function scrollToCategories() {
  if (dataset.categories.length === 0) return;
  scrollToCategory(dataset.categories[0].slug);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleScroll() {
  showBackToTop.value = window.scrollY > 400;
}

function observeSections() {
  const sections = document.querySelectorAll<HTMLElement>('[data-category-section="true"]');
  if (!sections.length) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeSlug.value = entry.target.id;
        }
      });
    },
    {
      root: null,
      threshold: 0.35,
    },
  );

  sections.forEach((section) => observer?.observe(section));
}

onMounted(() => {
  observeSections();
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
