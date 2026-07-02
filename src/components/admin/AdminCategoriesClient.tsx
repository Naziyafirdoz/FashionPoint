"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";

import { AdminCategoryThumbnail } from "@/components/admin/AdminCategoryThumbnail";

import { AdminHeader } from "@/components/admin/AdminHeader";

import { AdminTablePagination } from "@/components/admin/AdminTablePagination";

import { StatsCard } from "@/components/admin/StatsCard";

import {

  CategoryFormModal,

  type CategoryFormValues

} from "@/components/admin/CategoryFormModal";

import {
  categoryDescriptionPreview,
  filterAdminCategories,
  getAdminCategoryBannerUrl,
  getCategoryDescriptionValidationError,
  getHomepageFieldsValidationError,
  getNavbarPositionValidationError,
  type AdminCategoriesSummary,
  type AdminCategoryRow
} from "@/lib/admin/categories";

import type { AdminProductRow } from "@/lib/admin/products";



type StatusFilter = "all" | "active" | "inactive";



const PAGE_SIZE = 10;



const EMPTY_SUMMARY: AdminCategoriesSummary = {

  total_categories: 0,

  active_categories: 0,

  inactive_categories: 0,

  total_products: 0

};



export function AdminCategoriesClient() {

  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);

  const [products, setProducts] = useState<AdminProductRow[]>([]);

  const [summary, setSummary] = useState<AdminCategoriesSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [page, setPage] = useState(1);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [togglingNavbarId, setTogglingNavbarId] = useState<string | null>(null);

  const [updatingNavbarPositionId, setUpdatingNavbarPositionId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState<AdminCategoryRow | null>(null);

  const [viewing, setViewing] = useState<AdminCategoryRow | null>(null);



  const loadCategories = useCallback(async (silent = false) => {

    if (!silent) setLoading(true);

    try {

      const res = await fetch("/api/admin/categories");

      const data = await res.json();

      if (!res.ok) {

        toast.error(data.error ?? "Failed to load categories");

        setCategories([]);

        setSummary(EMPTY_SUMMARY);

        return;

      }

      setCategories(data.categories ?? []);

      setSummary(data.summary ?? EMPTY_SUMMARY);

    } catch {

      toast.error("Failed to load categories");

      setCategories([]);

      setSummary(EMPTY_SUMMARY);

    } finally {

      if (!silent) setLoading(false);

    }

  }, []);



  useEffect(() => {

    loadCategories();

  }, [loadCategories]);



  useEffect(() => {

    fetch("/api/admin/products")

      .then((r) => r.json())

      .then((data) => setProducts(data.products ?? []))

      .catch(() => setProducts([]));

  }, []);



  const categoryProductImages = useMemo(() => {

    const map = new Map<string, string>();

    for (const product of products) {

      if (!product.category_id || !product.images?.[0]) continue;

      if (!map.has(product.category_id)) {

        map.set(product.category_id, product.images[0]);

      }

    }

    return map;

  }, [products]);



  useEffect(() => {

    setPage(1);

  }, [search, statusFilter]);



  const filtered = useMemo(

    () => filterAdminCategories(categories, search, statusFilter),

    [categories, search, statusFilter]

  );



  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);



  const openAddModal = () => {

    setEditing(null);

    setModalOpen(true);

  };



  const openEditModal = (category: AdminCategoryRow) => {

    setEditing(category);

    setModalOpen(true);

  };



  const closeModal = () => {

    if (saving) return;

    setModalOpen(false);

    setEditing(null);

  };



  const handleSave = async (values: CategoryFormValues) => {
    const descriptionError = getCategoryDescriptionValidationError(values.description);
    if (descriptionError) {
      toast.error(descriptionError);
      return;
    }

    const homepageError = getHomepageFieldsValidationError({
      show_on_homepage: values.show_on_homepage,
      homepage_description: values.homepage_description,
      homepage_display_order: values.homepage_display_order,
      homepage_theme: values.homepage_theme,
      homepage_button_text: values.homepage_button_text
    });
    if (homepageError) {
      toast.error(homepageError);
      return;
    }

    setSaving(true);

    try {

      const payload = {

        name: values.name.trim(),

        slug: values.slug.trim(),

        description: values.description.trim() || null,

        image_url: values.image_url.trim() || null,

        sort_order: Number(values.sort_order) || 0,

        is_active: values.is_active,

        show_on_homepage: values.show_on_homepage,

        homepage_description: values.homepage_description.trim() || null,

        homepage_display_order: Number(values.homepage_display_order) || 0,

        homepage_theme: values.homepage_theme.trim() || "blush",

        homepage_button_text: values.homepage_button_text.trim() || "Explore Collection",

        homepage_banner_image_url: values.homepage_banner_image_url.trim() || null

      };



      const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories";

      const method = editing ? "PATCH" : "POST";



      const res = await fetch(url, {

        method,

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payload)

      });

      const data = await res.json();



      if (!res.ok) {

        toast.error(data.error ?? "Failed to save category");

        return;

      }



      toast.success(editing ? "Category updated" : "Category created");

      setModalOpen(false);

      setEditing(null);

      await loadCategories();

    } catch {

      toast.error("Failed to save category");

    } finally {

      setSaving(false);

    }

  };



  const handleDelete = async (category: AdminCategoryRow) => {

    const warning =

      category.product_count > 0

        ? `${category.name} has ${category.product_count} product(s). Delete anyway? This will fail if products are still assigned.`

        : `Delete ${category.name}? This cannot be undone.`;



    if (!window.confirm(warning)) return;



    setDeletingId(category.id);

    try {

      const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });

      const data = await res.json();

      if (!res.ok) {

        toast.error(data.error ?? "Failed to delete category");

        return;

      }

      toast.success("Category deleted");

      await loadCategories();

    } catch {

      toast.error("Failed to delete category");

    } finally {

      setDeletingId(null);

    }

  };



  const patchCategory = async (
    category: AdminCategoryRow,
    patch: Partial<Pick<AdminCategoryRow, "show_in_navbar" | "navbar_position">>
  ) => {
    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: category.name,
        slug: category.slug,
        description: category.description,
        image_url: category.image_url,
        sort_order: category.sort_order,
        is_active: category.is_active,
        show_in_navbar: patch.show_in_navbar ?? category.show_in_navbar,
        navbar_position:
          patch.navbar_position !== undefined ? patch.navbar_position : category.navbar_position,
        show_on_homepage: category.show_on_homepage,
        homepage_description: category.homepage_description,
        homepage_display_order: category.homepage_display_order,
        homepage_theme: category.homepage_theme,
        homepage_button_text: category.homepage_button_text,
        homepage_banner_image_url: category.homepage_banner_image_url
      })
    });

    const data = await res.json();
    return { ok: res.ok, data };
  };



  const handleToggleShowInNavbar = async (category: AdminCategoryRow) => {

    const nextValue = !category.show_in_navbar;

    setTogglingNavbarId(category.id);

    setCategories((prev) =>

      prev.map((row) =>

        row.id === category.id

          ? { ...row, show_in_navbar: nextValue, navbar_position: nextValue ? row.navbar_position : null }

          : row

      )

    );



    try {

      const { ok, data } = await patchCategory(category, {

        show_in_navbar: nextValue,

        navbar_position: nextValue ? category.navbar_position : null

      });



      if (!ok) {

        setCategories((prev) =>

          prev.map((row) =>

            row.id === category.id

              ? { ...row, show_in_navbar: category.show_in_navbar, navbar_position: category.navbar_position }

              : row

          )

        );

        toast.error(data.error ?? "Failed to update navbar visibility");

        return;

      }



      toast.success(nextValue ? "Category added to navbar" : "Category removed from navbar");

      await loadCategories(true);

    } catch {

      setCategories((prev) =>

        prev.map((row) =>

          row.id === category.id

            ? { ...row, show_in_navbar: category.show_in_navbar, navbar_position: category.navbar_position }

            : row

        )

      );

      toast.error("Failed to update navbar visibility");

    } finally {

      setTogglingNavbarId(null);

    }

  };



  const handleNavbarPositionChange = async (category: AdminCategoryRow, rawValue: string) => {

    if (!category.show_in_navbar) return;

    const trimmed = rawValue.trim();

    if (trimmed === "") return;

    const validationError = getNavbarPositionValidationError(trimmed);

    if (validationError) {

      toast.error(validationError);

      return;

    }

    const navbar_position = Number(trimmed);

    if (category.navbar_position === navbar_position) return;

    setUpdatingNavbarPositionId(category.id);

    try {

      const { ok, data } = await patchCategory(category, { navbar_position });



      if (!ok) {

        toast.error(data.error ?? "Failed to update navbar position");

        return;

      }



      toast.success("Navbar position updated");

      await loadCategories(true);

    } catch {

      toast.error("Failed to update navbar position");

    } finally {

      setUpdatingNavbarPositionId(null);

    }

  };



  return (

    <>

      <AdminHeader title="Categories" />

      <div className="p-6">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatsCard label="Total Categories" value={String(summary.total_categories)} />

          <StatsCard label="Active Categories" value={String(summary.active_categories)} />

          <StatsCard label="Inactive Categories" value={String(summary.inactive_categories)} />

          <StatsCard label="Total Products" value={String(summary.total_products)} />

        </div>



        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm text-foreground/80">

            <span className="font-semibold text-foreground">{filtered.length}</span>

            {filtered.length !== categories.length

              ? ` of ${categories.length} categories`

              : ` categor${categories.length === 1 ? "y" : "ies"}`}

          </p>

          <button type="button" onClick={openAddModal} className="btn-primary text-center">

            ADD CATEGORY

          </button>

        </div>



        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">

          <input

            type="search"

            placeholder="Search by name, slug, or description…"

            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"

            value={search}

            onChange={(e) => setSearch(e.target.value)}

          />

          <select

            className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-xs"

            value={statusFilter}

            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}

          >

            <option value="all">All statuses</option>

            <option value="active">Active</option>

            <option value="inactive">Inactive</option>

          </select>

        </div>



        <div className="mt-6 overflow-x-auto rounded-xl border bg-white">

          <table className="w-full min-w-[1020px] text-sm">

            <thead>

              <tr className="border-b bg-blush/50 text-left text-foreground/70">

                <th className="p-3 pr-4">Category</th>

                <th className="p-3 pr-4">Description</th>

                <th className="p-3 pr-4">Product Count</th>

                <th className="p-3 pr-4">Status</th>

                <th className="p-3 pr-4">Show in Navbar</th>

                <th className="p-3 pr-4">Navbar Position</th>

                <th className="p-3 pr-4">Sort Order</th>

                <th className="p-3">Actions</th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td colSpan={8} className="py-8 text-center text-foreground/60">

                    Loading categories…

                  </td>

                </tr>

              ) : paginated.length === 0 ? (

                <tr>

                  <td colSpan={8} className="py-8 text-center text-foreground/60">

                    {categories.length === 0

                      ? "No categories yet. Add your first category."

                      : "No categories match your filters."}

                  </td>

                </tr>

              ) : (

                paginated.map((c) => (

                  <tr key={c.id} className="border-b border-accent/10">

                    <td className="p-3 pr-4">

                      <div className="flex items-center gap-3">

                        <AdminCategoryThumbnail

                          src={getAdminCategoryBannerUrl(c) ?? categoryProductImages.get(c.id)}

                          alt={c.name}

                        />

                        <div className="min-w-0">

                          <p className="font-medium">{c.name}</p>

                          <p className="mt-0.5 font-mono text-xs text-foreground/50">{c.slug}</p>

                        </div>

                      </div>

                    </td>

                    <td className="max-w-xs p-3 pr-4">
                      {(() => {
                        const preview = categoryDescriptionPreview(c.description);
                        return (
                          <p
                            className={`line-clamp-2 text-sm ${
                              preview.hasDescription ? "text-foreground/80" : "text-foreground/50"
                            }`}
                            title={preview.full ?? undefined}
                          >
                            {preview.text}
                          </p>
                        );
                      })()}
                    </td>

                    <td className="p-3 pr-4">{c.product_count}</td>

                    <td className="p-3 pr-4">

                      <span

                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${

                          c.is_active

                            ? "bg-green-100 text-green-800"

                            : "bg-gray-100 text-gray-700"

                        }`}

                      >

                        {c.is_active ? "Active" : "Inactive"}

                      </span>

                    </td>

                    <td className="p-3 pr-4">

                      <label className="inline-flex items-center gap-2 text-xs text-foreground/80">

                        <input

                          type="checkbox"

                          checked={c.show_in_navbar}

                          disabled={togglingNavbarId === c.id}

                          onChange={() => handleToggleShowInNavbar(c)}

                        />

                        Show in Navbar

                      </label>

                    </td>

                    <td className="p-3 pr-4">

                      <input

                        key={`${c.id}-${c.navbar_position ?? "empty"}`}

                        type="number"

                        min={1}

                        step={1}

                        defaultValue={c.show_in_navbar && c.navbar_position != null ? c.navbar_position : ""}

                        disabled={!c.show_in_navbar || updatingNavbarPositionId === c.id}

                        placeholder="—"

                        className="w-20 rounded-lg border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-foreground/40"

                        onBlur={(e) => handleNavbarPositionChange(c, e.target.value)}

                        onKeyDown={(e) => {

                          if (e.key === "Enter") {

                            e.currentTarget.blur();

                          }

                        }}

                      />

                    </td>

                    <td className="p-3 pr-4">{c.sort_order}</td>

                    <td className="p-3">

                      <div className="flex flex-wrap gap-3">

                        <button

                          type="button"

                          onClick={() => setViewing(c)}

                          className="text-foreground/70 underline"

                        >

                          View

                        </button>

                        <button

                          type="button"

                          onClick={() => openEditModal(c)}

                          className="text-primary underline"

                        >

                          Edit

                        </button>

                        <button

                          type="button"

                          disabled={deletingId === c.id}

                          onClick={() => handleDelete(c)}

                          className="text-red-600 underline disabled:opacity-50"

                        >

                          {deletingId === c.id ? "Deleting…" : "Delete"}

                        </button>

                      </div>

                    </td>

                  </tr>

                ))

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



      <CategoryFormModal

        open={modalOpen}

        title={editing ? "Edit Category" : "Add Category"}

        initial={editing}

        saving={saving}

        onClose={closeModal}

        onSubmit={handleSave}

      />



      {viewing && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">

            <h2 className="font-bold text-primary">{viewing.name}</h2>

            <dl className="mt-4 space-y-3 text-sm">

              <div>

                <dt className="text-foreground/60">Slug</dt>

                <dd className="font-mono">{viewing.slug}</dd>

              </div>

              <div>

                <dt className="text-foreground/60">Description</dt>

                <dd className="whitespace-pre-wrap">
                  {viewing.description?.trim() ? viewing.description : "No description"}
                </dd>

              </div>

              <div>

                <dt className="text-foreground/60">Product Count</dt>

                <dd>{viewing.product_count}</dd>

              </div>

              <div>

                <dt className="text-foreground/60">Sort Order</dt>

                <dd>{viewing.sort_order}</dd>

              </div>

              <div>

                <dt className="text-foreground/60">Status</dt>

                <dd>{viewing.is_active ? "Active" : "Inactive"}</dd>

              </div>

            </dl>

            <button type="button" className="btn-primary mt-6 w-full" onClick={() => setViewing(null)}>

              Close

            </button>

          </div>

        </div>

      )}

    </>

  );

}


