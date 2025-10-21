<template>
  <section
    class="relative overflow-hidden rounded-3xl bg-white/90 shadow-card backdrop-blur-sm ring-1 ring-white/60"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#cbe6ff_0,transparent_55%)]"
    ></div>
    <div
      class="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,#d8f5ee_0,transparent_65%)]"
    ></div>
    <div class="relative z-10 mx-auto max-w-content px-6 py-16 sm:px-10 sm:py-24">
      <div class="mb-8 flex flex-wrap items-center gap-4 text-sm text-primary-dark/80">
        <span class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 font-medium">
          <span class="h-2 w-2 rounded-full bg-primary"></span>
          最新统计：{{ summary.lastUpdated }}
        </span>
        <span class="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 font-medium">
          <span class="h-2 w-2 rounded-full bg-accent"></span>
          数据来源：{{ summary.source }}
        </span>
      </div>
      <div class="max-w-3xl">
        <h1 class="text-4xl font-semibold text-neutral-900 sm:text-5xl">
          {{ title }}
        </h1>
        <p class="mt-6 text-lg leading-relaxed text-neutral-600 sm:text-xl">
          汇集全国常见原研药品资料，覆盖
          <span class="font-semibold text-primary">{{ totalCategories }}</span>
          个临床科室分类，共
          <span class="font-semibold text-primary">{{ totalDrugs }}</span>
          个商品条目，来自
          <span class="font-semibold text-primary">{{ manufacturerCount }}</span>
          家生产厂家，帮助医务人员、患者快速定位权威进口药信息。
        </p>
      </div>
      <div class="mt-12 flex flex-wrap gap-4">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/30 transition hover:bg-primary-dark"
          @click="$emit('scrollToCategories')"
        >
          浏览全部分类
          <span aria-hidden="true">↓</span>
        </button>
        <a
          :href="sourceUrl"
          target="_blank"
          rel="noreferrer noopener"
          class="inline-flex items-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-medium text-primary transition hover:border-primary hover:text-primary-dark"
        >
          查看原始 Markdown
          <span aria-hidden="true">↗</span>
        </a>
      </div>
      <dl class="mt-16 grid gap-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur"
        >
          <dt class="text-neutral-500">{{ stat.label }}</dt>
          <dd class="mt-2 text-2xl font-semibold text-neutral-900">
            {{ stat.value }}
          </dd>
          <p v-if="stat.caption" class="mt-2 text-xs text-neutral-400">
            {{ stat.caption }}
          </p>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Stat {
  label: string;
  value: string;
  caption?: string;
}

defineProps<{
  title: string;
  summary: {
    total: string;
    lastUpdated: string;
    source: string;
  };
  totalCategories: number;
  totalDrugs: number;
  manufacturerCount: number;
  sourceUrl: string;
  stats: Stat[];
}>();

defineEmits<{
  (e: 'scrollToCategories'): void;
}>();
</script>
