import type { Metadata } from "next";
import { Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@repo/ui";
import { CategoryDialog } from "@/features/categories/category-dialog";
import { CategoryList } from "@/features/categories/category-list";
import { listCategoryTree } from "@/features/categories/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireUser();
  const tree = await listCategoryTree(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        description="Group spending and income so budgets and reports line up."
        actions={
          <CategoryDialog
            categories={tree}
            trigger={
              <Button>
                <Plus className="size-4" aria-hidden />
                Add category
              </Button>
            }
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense</CardTitle>
            <CardDescription>Everyday spending, bills, and sinking funds.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryList categories={tree} kind="expense" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income</CardTitle>
            <CardDescription>Salary, side work, and anything else coming in.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryList categories={tree} kind="income" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
