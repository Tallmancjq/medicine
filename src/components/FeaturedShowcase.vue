<template>
  <section class="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-primary">热门药品精选</p>
        <h2 class="mt-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">临床常备 · 先睹为快</h2>
        <p class="mt-2 max-w-2xl text-sm text-neutral-500 sm:text-base">
          依据平台热度挑选出高关注度的进口药品，可快速查看商品名、通用名及生产厂家信息。
        </p>
      </div>
      <div class="text-xs text-neutral-400 sm:text-sm">
        共 {{ items.length }} 条
      </div>
    </div>
    <div class="relative mt-8">
      <div class="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white via-white/70 to-transparent"></div>
      <div class="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/70 to-transparent"></div>
      <div class="flex gap-5 overflow-x-auto pb-4 pt-2">
        <article
          v-for="item in showcaseItems"
          :key="item.brandName + item.genericName"
          class="min-w-[260px] max-w-[280px] flex-1 space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-card"
        >
          <img
            :src="item.image"
            :alt="`${item.brandName} - ${item.genericName}`"
            loading="lazy"
            class="aspect-[16/11] w-full rounded-xl object-cover shadow-sm"
          />
          <h3 class="text-lg font-semibold text-neutral-900">
            {{ item.brandName }}
          </h3>
          <p class="mt-1 text-sm text-primary-dark">{{ item.genericName }}</p>
          <dl class="mt-4 space-y-2 text-xs text-neutral-500">
            <div>
              <dt class="font-medium text-neutral-600">厂家简称</dt>
              <dd class="mt-1 text-neutral-700">{{ item.manufacturerShort }}</dd>
            </div>
            <div>
              <dt class="font-medium text-neutral-600">厂家全称</dt>
              <dd class="mt-1 leading-relaxed text-neutral-700">
                {{ item.manufacturerFull }}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DrugItem } from '../types/drug';

const props = defineProps<{
  items: DrugItem[];
}>();

const showcaseItems = computed(() => props.items.slice(0, 12));
</script>
