<template>
  <nav class="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur">
    <div class="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-2 text-xs text-neutral-500 sm:text-sm">
        <span class="font-medium text-neutral-700">分类导航</span>
        <span class="hidden sm:inline">｜快速定位到对应科室药品</span>
      </div>
      <button
        type="button"
        class="hidden rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-800 sm:inline-flex"
        @click="$emit('scrollTop')"
      >
        返回顶部
      </button>
    </div>
    <div class="border-t border-white/60 bg-white/60">
      <div class="relative mx-auto max-w-content px-4 sm:px-6">
        <div class="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
        <div class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent"></div>
        <div class="flex gap-2 overflow-x-auto pb-4 pt-3 text-xs sm:text-sm">
          <button
            v-for="category in categories"
            :key="category.slug"
            type="button"
            class="inline-flex min-w-max items-center gap-2 rounded-full border px-3 py-2 transition"
            :class="category.slug === activeSlug
              ? 'border-primary bg-primary text-white shadow-sm'
              : 'border-transparent bg-white/80 text-neutral-600 hover:border-primary/30 hover:bg-primary/10 hover:text-primary-dark'"
            @click="$emit('select', category.slug)"
          >
            <span>{{ category.name }}</span>
            <span class="rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-semibold" :class="category.slug === activeSlug ? 'text-primary-dark' : 'text-primary'">
              {{ category.count }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { DrugCategory } from '../types/drug';

defineProps<{
  categories: Pick<DrugCategory, 'slug' | 'name' | 'count'>[];
  activeSlug: string;
}>();

defineEmits<{
  (e: 'select', slug: string): void;
  (e: 'scrollTop'): void;
}>();
</script>
