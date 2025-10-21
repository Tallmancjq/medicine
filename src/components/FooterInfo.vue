<template>
  <footer class="mx-auto max-w-content px-4 pb-16 pt-10 text-xs text-neutral-400 sm:px-6 sm:text-sm">
    <div class="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
      <p>
        数据来源：<span class="font-medium text-neutral-600">{{ summary.source }}</span>（统计截止：
        {{ summary.lastUpdated }}）
      </p>
      <p class="mt-2">
        数据集生成时间：{{ generatedAt }} ｜ 总计 {{ totalDrugs }} 条药品数据，覆盖 {{ totalCategories }} 个分类。
      </p>
      <p class="mt-2">
        若 README 更新，可执行 <code class="rounded bg-neutral-900/90 px-2 py-1 text-xs text-white">npm run generate:data</code>
        重拉数据。
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { DrugSummary } from '../types/drug';

defineProps<{
  summary: DrugSummary;
  generatedAt: string;
  totalDrugs: number;
  totalCategories: number;
}>();
</script>
