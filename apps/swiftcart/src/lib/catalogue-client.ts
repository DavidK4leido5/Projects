import type { ProductCardModel } from "@/features/catalog/queries";

/**
 * The catalogue state the grid sends to /api/catalogue when it appends. It is
 * exactly what the server component resolved, so the API and the first page
 * agree.
 */
export type CatalogueQuery = {
  q?: string;
  store?: string;
  category?: string;
  sort?: string;
  stock?: string;
};

/**
 * One page of the catalogue as /api/catalogue returns it. Items follow
 * ProductCardModel, except createdAt crosses JSON as a string; the card never
 * renders it.
 */
export type CataloguePage = {
  items: ProductCardModel[];
  page: number;
  pages: number;
  total: number;
};
