"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "@repo/shared";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Skeleton } from "./skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

type SortDirection = "asc" | "desc";

type ManualPagination = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

type TableSorting = {
  sortBy: string;
  direction: SortDirection;
  onChange: (sortBy: string, direction: SortDirection) => void;
};

type TableSelection = {
  selected: string[];
  onChange: (selected: string[]) => void;
};

type DataTableProps<TData, TValue = unknown> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  emptyState?: React.ReactNode;
  toolbar?: React.ReactNode;
  pageSize?: number;
  manualPagination?: ManualPagination;
  sorting?: TableSorting;
  selection?: TableSelection;
  isLoading?: boolean;
  caption?: string;
};

const EMPTY_SELECTION: string[] = [];
const SKELETON_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-3/5"];

function DataTable<TData, TValue = unknown>({
  columns,
  data,
  getRowId,
  emptyState,
  toolbar,
  pageSize,
  manualPagination,
  sorting,
  selection,
  isLoading = false,
  caption,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [pageIndex, setPageIndex] = React.useState(0);

  const selectedIds = selection ? selection.selected : EMPTY_SELECTION;
  const rowSelection: RowSelectionState = Object.fromEntries(selectedIds.map((id) => [id, true]));
  const sortingState: SortingState = sorting
    ? sorting.sortBy
      ? [{ id: sorting.sortBy, desc: sorting.direction === "desc" }]
      : []
    : internalSorting;
  const paginationState: PaginationState = {
    pageIndex: manualPagination ? Math.max(0, manualPagination.page - 1) : pageIndex,
    pageSize: pageSize ?? 10,
  };

  const tableColumns: ColumnDef<TData, TValue>[] = selection
    ? [
        {
          id: "select",
          enableSorting: false,
          enableHiding: false,
          header: ({ table }) => (
            <Checkbox
              aria-label="Select all rows"
              checked={
                table.getIsAllPageRowsSelected()
                  ? true
                  : table.getIsSomePageRowsSelected()
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              aria-label={"Select row " + String(row.index + 1)}
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onCheckedChange={(checked) => row.toggleSelected(checked === true)}
            />
          ),
        },
        ...columns,
      ]
    : columns;

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sortingState) : updater;
    if (sorting) {
      const first = next[0];
      if (first) sorting.onChange(first.id, first.desc ? "desc" : "asc");
      return;
    }
    setInternalSorting(next);
  };

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    if (!selection) return;
    const next = typeof updater === "function" ? updater(rowSelection) : updater;
    selection.onChange(Object.keys(next).filter((id) => next[id]));
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (manualPagination) return;
    const next = typeof updater === "function" ? updater(paginationState) : updater;
    setPageIndex(next.pageIndex);
  };

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId,
    state: { sorting: sortingState, rowSelection, pagination: paginationState },
    enableSortingRemoval: false,
    enableRowSelection: Boolean(selection),
    manualSorting: Boolean(sorting),
    manualPagination: Boolean(manualPagination),
    pageCount: manualPagination?.pageCount,
    onSortingChange: handleSortingChange,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sorting ? undefined : getSortedRowModel(),
    getPaginationRowModel:
      manualPagination || pageSize === undefined ? undefined : getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const columnCount = tableColumns.length;
  const pageCount = manualPagination ? manualPagination.pageCount : table.getPageCount();
  const currentPage = manualPagination
    ? Math.max(1, manualPagination.page)
    : table.getState().pagination.pageIndex + 1;
  const totalPages = Math.max(1, pageCount);
  const showPagination = Boolean(manualPagination) || (pageSize !== undefined && pageCount > 1);

  function goToPage(page: number) {
    if (manualPagination) {
      manualPagination.onPageChange(page);
      return;
    }
    table.setPageIndex(page - 1);
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {toolbar ? <div className="border-b border-border p-3">{toolbar}</div> : null}

      <Table>
        {caption ? <TableCaption>{caption}</TableCaption> : null}
        <TableHeader className="bg-card">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={
                      canSort
                        ? sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                    className={cn(
                      "sticky top-0 z-10 bg-card whitespace-nowrap",
                      header.column.id === "select" && "w-10 pr-0",
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ChevronUp className="size-3 shrink-0" aria-hidden="true" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown
                            className="size-3 shrink-0 text-muted-foreground/60"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="tabular-nums">
          {isLoading ? (
            Array.from({ length: pageSize ?? 5 }).map((_, rowIndex) => (
              <TableRow key={"skeleton-" + String(rowIndex)} className="hover:bg-transparent">
                {tableColumns.map((column, columnIndex) => (
                  <TableCell key={(column.id ?? String(columnIndex)) + "-" + String(rowIndex)}>
                    <Skeleton
                      className={cn(
                        "h-4",
                        SKELETON_WIDTHS[columnIndex % SKELETON_WIDTHS.length] ?? "w-2/3",
                      )}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="p-0">
                {emptyState ?? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No results found.
                  </p>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(row.getIsSelected() && "bg-muted/40")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showPagination ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="text-xs tabular-nums text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { DataTable, type DataTableProps };
