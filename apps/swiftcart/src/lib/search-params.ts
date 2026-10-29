export type CatalogueParams = {
  q?: string;
  store?: string;
  sort?: string;
  stock?: string;
  page?: string;
};

export const CATALOGUE_PATH = "/";

export const SORT_OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
] as const;

/** Serialises catalogue state, omitting values that are already the default. */
export function catalogueHref(params: CatalogueParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.store) search.set("store", params.store);
  if (params.sort && params.sort !== "new") search.set("sort", params.sort);
  if (params.stock === "in") search.set("stock", "in");
  if (params.page && params.page !== "1") search.set("page", params.page);
  const query = search.toString();
  return query ? CATALOGUE_PATH + "?" + query : CATALOGUE_PATH;
}

/** Applies one key and drops page, because page 3 of a narrower view is usually empty. */
export function withCatalogueParam(
  current: CatalogueParams,
  key: keyof CatalogueParams,
  value: string | undefined,
): CatalogueParams {
  const next: CatalogueParams = { ...current, [key]: value };
  if (key !== "page") next.page = undefined;
  return next;
}

export function readCatalogueParams(search: URLSearchParams): CatalogueParams {
  return {
    q: search.get("q") ?? undefined,
    store: search.get("store") ?? undefined,
    sort: search.get("sort") ?? undefined,
    stock: search.get("stock") ?? undefined,
    page: search.get("page") ?? undefined,
  };
}
