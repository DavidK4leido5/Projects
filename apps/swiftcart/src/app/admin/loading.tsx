import { AdminOverviewSkeleton } from "@/components/admin/skeletons";

/** /admin is a card grid, not a table, so it reuses the skeleton its page streams with. */
export default function Loading() {
  return <AdminOverviewSkeleton />;
}
