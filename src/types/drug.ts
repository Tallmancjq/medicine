export interface DrugItem {
  brandName: string;
  genericName: string;
  manufacturerShort: string;
  manufacturerFull: string;
  image: string;
}

export interface DrugCategory {
  name: string;
  slug: string;
  count: number;
  items: DrugItem[];
}

export interface DrugSummary {
  total: string;
  lastUpdated: string;
  source: string;
}

export interface DrugDataset {
  title: string;
  summary: DrugSummary;
  categories: DrugCategory[];
  totalCategories: number;
  generatedAt: string;
  sourceUrl: string;
}
