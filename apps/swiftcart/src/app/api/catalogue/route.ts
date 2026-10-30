import { searchProducts } from "@/features/catalog/queries";

/** One page of the catalogue for the mobile feed; same query as the page. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawPage = params.get("page");
  const page = rawPage === null || rawPage.trim() === "" ? 1 : Number(rawPage);

  if (!Number.isFinite(page)) {
    return Response.json({ error: "page must be a number" }, { status: 400 });
  }

  const sort = params.get("sort");

  const result = await searchProducts({
    q: params.get("q")?.trim() ?? "",
    store: params.get("store") ?? "",
    category: params.get("category")?.trim() ?? "",
    sort: sort === "price-asc" || sort === "price-desc" ? sort : "new",
    inStock: params.get("stock") === "in",
    page,
    perPage: 12,
  });

  return Response.json({
    items: result.items,
    page: result.page,
    pages: result.pages,
    total: result.total,
  });
}
