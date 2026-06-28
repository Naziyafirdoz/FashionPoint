"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminCategoryThumbnail } from "@/components/admin/AdminCategoryThumbnail";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import {
  SubCategoryFormModal,
  type SubCategoryFormValues
} from "@/components/admin/SubCategoryFormModal";
import {
  filterAdminSubCategories,
  getSubCategoryDescriptionValidationError,
  subCategoryDescriptionPreview,
  type AdminSubCategoryRow
} from "@/lib/admin/sub-categories";
import type { Category } from "@/types";

type StatusFilter = "all" | "active" | "inactive";
const PAGE_SIZE = 10;

export function AdminSubCategoriesClient() {
  const [rows, setRows] = useState<AdminSubCategoryRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSubCategoryRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, catRes] = await Promise.all([
        fetch("/api/admin/sub-categories"),
        fetch("/api/categories")
      ]);
      const subData = await subRes.json();
      const catData = await catRes.json();
      if (!subRes.ok) {
        toast.error(subData.error ?? "Failed to load sub categories");
        setRows([]);
      } else {
        setRows(subData.sub_categories ?? []);
      }
      setCategories(Array.isArray(catData.categories) ? catData.categories : []);
    } catch {
      toast.error("Failed to load sub categories");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const filtered = useMemo(
    () => filterAdminSubCategories(rows, search, categoryFilter, statusFilter),
    [rows, search, categoryFilter, statusFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (values: SubCategoryFormValues) => {
    const descriptionError = getSubCategoryDescriptionValidationError(values.description);
    if (descriptionError) {
      toast.error(descriptionError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category_id: values.category_id,
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description.trim() || null,
        image_url: values.image_url.trim() || null,
        sort_order: Number(values.sort_order) || 0,
        is_active: values.is_active
      };
      const url = editing ? `/api/admin/sub-categories/${editing.id}` : "/api/admin/sub-categories";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save sub category");
        return;
      }
      toast.success(editing ? "Sub category updated" : "Sub category created");
      setModalOpen(false);
      setEditing(null);
      await loadData();
    } catch {
      toast.error("Failed to save sub category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: AdminSubCategoryRow) => {
    if (!window.confirm(`Delete ${row.name}? This cannot be undone.`)) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/admin/sub-categories/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete sub category");
        return;
      }
      toast.success("Sub category deleted");
      await loadData();
    } catch {
      toast.error("Failed to delete sub category");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AdminHeader title="Sub Categories" />
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">{filtered.length}</span>
            {filtered.length !== rows.length ? ` of ${rows.length} sub categories` : " sub categories"}
          </p>
          <button
            type="button"
            className="btn-primary text-center"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            ADD SUB CATEGORY
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="search"
            placeholder="Search by name, slug, or parent…"
            className="w-full rounded-lg border px-3 py-2 text-sm lg:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm lg:max-w-xs"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm lg:max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b bg-blush/50 text-left text-foreground/70">
                <th className="p-3 pr-4">Image</th>
                <th className="p-3 pr-4">Sub Category</th>
                <th className="p-3 pr-4">Parent Category</th>
                <th className="p-3 pr-4">Description</th>
                <th className="p-3 pr-4">Product Count</th>
                <th className="p-3 pr-4">Status</th>
                <th className="p-3 pr-4">Sort Order</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-foreground/60">
                    Loading sub categories…
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-foreground/60">
                    {rows.length === 0 ? "No sub categories yet." : "No sub categories match your filters."}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => {
                  const preview = subCategoryDescriptionPreview(row.description);
                  return (
                    <tr key={row.id} className="border-b border-accent/10">
                      <td className="p-3 pr-4">
                        <AdminCategoryThumbnail src={row.image_url} alt={row.name} />
                      </td>
                      <td className="p-3 pr-4">
                        <p className="font-medium">{row.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-foreground/50">{row.slug}</p>
                      </td>
                      <td className="p-3 pr-4">{row.category_name || "—"}</td>
                      <td className="max-w-xs p-3 pr-4">
                        <p
                          className={`line-clamp-2 text-sm ${
                            preview.hasDescription ? "text-foreground/80" : "text-foreground/50"
                          }`}
                        >
                          {preview.text}
                        </p>
                      </td>
                      <td className="p-3 pr-4">{row.product_count}</td>
                      <td className="p-3 pr-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 pr-4">{row.sort_order}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() => {
                              setEditing(row);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === row.id}
                            className="text-red-600 underline disabled:opacity-50"
                            onClick={() => handleDelete(row)}
                          >
                            {deletingId === row.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <AdminTablePagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      <SubCategoryFormModal
        open={modalOpen}
        title={editing ? "Edit Sub Category" : "Add Sub Category"}
        categories={categories}
        initial={editing}
        defaultCategoryId={categoryFilter || undefined}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSave}
      />
    </>
  );
}
