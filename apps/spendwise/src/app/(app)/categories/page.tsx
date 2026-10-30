import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { CategoriesView } from "@/features/categories/categories-view";
import { listCategoryTree } from "@/features/categories/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CategoriesBody />
    </Suspense>
  );
}

async function CategoriesBody() {
  const user = await requireUser();
  const tree = await listCategoryTree(user.id);

  return <CategoriesView categories={tree} />;
}
