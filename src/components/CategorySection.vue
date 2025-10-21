<template>
  <section
    :id="category.slug"
    data-category-section="true"
    class="mx-auto max-w-content scroll-mt-24 px-4 py-16 sm:px-6"
  >
    <header class="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p class="text-sm font-medium text-primary">
          {{ category.name }}
        </p>
        <h2 class="mt-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">
          {{ category.name }}（{{ category.count }}）
        </h2>
        <p class="mt-3 max-w-3xl text-sm text-neutral-500 sm:text-base">
          可使用搜索框快速定位药品，或按厂家筛选。点击表头可切换排序方向。
        </p>
      </div>
      <div class="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-xs text-neutral-500 shadow-sm">
        匹配结果：<span class="font-semibold text-primary">{{ filteredItems.length }}</span> / {{ category.items.length }}
      </div>
    </header>

    <div class="mt-8 grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <label class="relative flex items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-500 focus-within:border-primary focus-within:text-primary">
        <span class="mr-3 text-neutral-300">🔍</span>
        <input
          v-model="searchTerm"
          type="search"
          placeholder="搜索商品名 / 通用名 / 厂家"
          class="w-full border-none bg-transparent text-neutral-700 outline-none placeholder:text-neutral-300"
        />
      </label>

      <div class="flex flex-wrap justify-end gap-2">
        <select
          v-model="selectedManufacturer"
          class="h-10 min-w-[160px] rounded-full border border-neutral-200 bg-white px-4 text-sm text-neutral-600 transition focus:border-primary focus:text-primary-dark"
        >
          <option value="">全部厂家</option>
          <option v-for="manufacturer in manufacturerOptions" :key="manufacturer" :value="manufacturer">
            {{ manufacturer }}
          </option>
        </select>
        <div class="flex items-center overflow-hidden rounded-full border border-neutral-200">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="border-r border-neutral-100 px-4 py-2 text-xs font-medium transition last:border-r-0"
            :class="option.key === sortKey
              ? 'bg-primary text-white'
              : 'bg-white text-neutral-500 hover:bg-primary/10 hover:text-primary-dark'"
            @click="setSort(option.key)"
          >
            {{ option.label }}
            <span
              v-if="option.key === sortKey"
              class="ml-1"
            >{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="mt-8 overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-sm">
      <div class="max-h-[520px] overflow-y-auto">
        <table class="min-w-full divide-y divide-neutral-100 text-left text-sm text-neutral-700">
          <thead class="sticky top-0 z-10 bg-white/95 text-xs font-medium uppercase tracking-wide text-neutral-400 backdrop-blur">
            <tr>
              <th scope="col" class="px-6 py-4">预览</th>
              <th scope="col" class="px-6 py-4">商品名</th>
              <th scope="col" class="px-6 py-4">通用名</th>
              <th scope="col" class="px-6 py-4">厂家（简称）</th>
              <th scope="col" class="px-6 py-4">厂家（全称）</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.brandName + item.genericName"
              class="odd:bg-white even:bg-neutral-50/70"
            >
              <td class="px-6 py-4">
                <img
                  :src="item.image"
                  :alt="`${item.brandName} - ${item.genericName}`"
                  loading="lazy"
                  class="h-16 w-20 rounded-xl object-cover shadow-sm ring-1 ring-white/60"
                />
              </td>
              <td class="px-6 py-4 font-medium text-neutral-900">
                {{ item.brandName }}
              </td>
              <td class="px-6 py-4 text-neutral-600">
                {{ item.genericName }}
              </td>
              <td class="px-6 py-4 text-neutral-600">
                {{ item.manufacturerShort }}
              </td>
              <td class="px-6 py-4 text-neutral-500">
                {{ item.manufacturerFull }}
              </td>
            </tr>
            <tr v-if="filteredItems.length === 0">
              <td colspan="5" class="px-6 py-16 text-center text-neutral-400">
                未找到匹配药品，请调整搜索条件。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { DrugCategory, DrugItem } from '../types/drug';

const props = defineProps<{
  category: DrugCategory;
}>();

const searchTerm = ref('');
const selectedManufacturer = ref('');
const sortKey = ref<'brandName' | 'genericName' | 'manufacturerShort'>('brandName');
const sortOrder = ref<'asc' | 'desc'>('asc');

const manufacturerOptions = computed(() => {
  const set = new Set(
    props.category.items
      .map((item) => item.manufacturerShort)
      .filter((name) => name && name !== '-' && name !== '—'),
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
});

const sortOptions = [
  { key: 'brandName', label: '按商品名' },
  { key: 'genericName', label: '按通用名' },
  { key: 'manufacturerShort', label: '按厂家' },
] as const;

const filteredItems = computed<DrugItem[]>(() => {
  const term = searchTerm.value.trim();
  const manufacturer = selectedManufacturer.value.trim();
  const normalized = term.toLowerCase();

  let result = props.category.items;

  if (term) {
    result = result.filter((item) => {
      const joined = [item.brandName, item.genericName, item.manufacturerShort, item.manufacturerFull]
        .join(' ')
        .toLowerCase();
      return joined.includes(normalized);
    });
  }

  if (manufacturer) {
    result = result.filter((item) => item.manufacturerShort === manufacturer);
  }

  const key = sortKey.value;
  const order = sortOrder.value === 'asc' ? 1 : -1;

  return [...result].sort((a, b) => a[key].localeCompare(b[key], 'zh-Hans-CN') * order);
});

function setSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
}
</script>
