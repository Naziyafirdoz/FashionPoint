"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CategorySelect } from "@/components/admin/CategorySelect";
import { SubCategoryField } from "@/components/admin/SubCategoryField";
import { ProductAttributesSection } from "@/components/admin/products/ProductAttributesSection";
import { ColorPicker } from "@/app/(admin)/admin/products/new/components/ColorPicker";
import { colorNamesFromSwatches } from "@/lib/products/color-swatches";
import type { ProductColorSwatch } from "@/types";
import { SizePicker } from "@/app/(admin)/admin/products/new/components/SizePicker";
import { slugify } from "@/lib/product-filters";
import {
  buildAdminVariantMatrixRows,
  mergeVariantMatrixRows,
  type AdminProductDetail,
  type AdminProductVariant,
  type AdminVariantMatrixRow
} from "@/lib/admin/products";
import { ProductVariantMatrix } from "@/components/admin/products/ProductVariantMatrix";
import { PRODUCT_STATUS_OPTIONS, type ProductStatus } from "@/lib/products/status";

type AdminEditProductClientProps = {
  productId: string;
};

export function AdminEditProductClient({ productId }: AdminEditProductClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadedVariants, setLoadedVariants] = useState<AdminProductVariant[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    detailed_description: "",
    price: "",
    compare_price: "",
    category_id: "",
    sub_category_id: "",
    fabric: "",
    neck_type: "",
    sleeve_type: "",
    closure_type: "",
    occasion: [] as string[],
    status: "draft" as ProductStatus,
    is_featured: false,
    colors: [] as string[],
    color_swatches: [] as ProductColorSwatch[],
    sizes: [] as string[]
  });
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<AdminVariantMatrixRow[]>([]);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load product");
        setFound(false);
        return null;
      }
      const product = data.product as AdminProductDetail;
      setFound(true);
      setForm({
        name: product.name,
        short_description: product.short_description ?? "",
        detailed_description: product.detailed_description ?? "",
        price: String(product.price),
        compare_price: product.compare_price != null ? String(product.compare_price) : "",
        category_id: product.category_id ?? "",
        sub_category_id: product.sub_category_id ?? "",
        fabric: product.fabric ?? "",
        neck_type: product.neck_type ?? "",
        sleeve_type: product.sleeve_type ?? "",
        closure_type: product.closure_type ?? "",
        occasion: product.occasion,
        status: product.status,
        is_featured: product.is_featured,
        colors: product.colors,
        color_swatches: product.color_swatches,
        sizes: product.sizes
      });
      setImages(product.images);
      setLoadedVariants(product.variants);
      setVariants(
        buildAdminVariantMatrixRows(product.sizes, product.colors, product.variants, {
          price: product.price,
          compare_price: product.compare_price
        })
      );
      return product;
    } catch {
      toast.error("Failed to load product");
      setFound(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    const colorNames = colorNamesFromSwatches(form.color_swatches);
    const basePrice = Number(form.price) || 0;
    const baseCompare = form.compare_price ? Number(form.compare_price) : null;
    setVariants((prev) => {
      const next = buildAdminVariantMatrixRows(form.sizes, colorNames, loadedVariants, {
        price: basePrice,
        compare_price: baseCompare
      });
      return mergeVariantMatrixRows(next, prev);
    });
  }, [form.sizes, form.color_swatches, form.price, form.compare_price, loadedVariants]);

  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload/image", { method: "POST", body: fd });
        const data = await up.json();
        if (data.url) {
          setImages((prev) => [...prev, data.url]);
        }
      }
      toast.success("Image(s) uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    if (!form.category_id) {
      toast.error("Select a category");
      return;
    }
    if (!form.color_swatches.length || !form.sizes.length) {
      toast.error("Select at least one color and size");
      return;
    }

    setSaving(true);
    try {
      const colorNames = colorNamesFromSwatches(form.color_swatches);
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.name),
        short_description: form.short_description.trim(),
        detailed_description: form.detailed_description.trim(),
        category_id: form.category_id,
        sub_category_id: form.sub_category_id || null,
        price: Number(form.price),
        compare_price: form.compare_price ? Number(form.compare_price) : null,
        fabric: form.fabric.trim() || null,
        neck_type: form.neck_type.trim() || null,
        sleeve_type: form.sleeve_type.trim() || null,
        closure_type: form.closure_type.trim() || null,
        occasion: form.occasion,
        status: form.status,
        is_featured: form.is_featured,
        colors: colorNames,
        color_swatches: form.color_swatches,
        sizes: form.sizes,
        images,
        variants: variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          price: v.price,
          compare_price: v.compare_price,
          stock_quantity: v.stock_quantity,
          sku: v.sku.trim() || null
        }))
      };

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to save product");
        return;
      }

      toast.success("Product updated");
      router.push("/admin/products");
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== form.name) {
      toast.error("Type the product name exactly to confirm deletion");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete product");
        return;
      }
      toast.success("Product deleted");
      router.push("/admin/products");
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminHeader title="Edit Product" />
        <p className="p-6 text-sm text-foreground/60">Loading product…</p>
      </>
    );
  }

  if (!found) {
    return (
      <>
        <AdminHeader title="Edit Product" />
        <p className="p-6 text-sm text-red-600">
          Product not found.{" "}
          <Link href="/admin/products" className="text-primary underline">
            Back to products
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Edit Product" />
      <form onSubmit={handleSave} className="grid gap-8 p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Images</p>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-accent/40 p-6 text-center text-sm">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onImageUpload}
              />
              {uploading ? "Uploading…" : "Upload additional images"}
            </label>
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {images.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border">
                    {url.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Image src={url} alt="" fill className="object-cover" sizes="160px" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            required
            placeholder="Product Name *"
            className="w-full rounded-lg border px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            required
            placeholder="Short Description *"
            className="w-full rounded-lg border px-3 py-2"
            rows={3}
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.target.value })}
          />
          <textarea
            placeholder="Detailed Description"
            className="w-full rounded-lg border px-3 py-2"
            rows={4}
            value={form.detailed_description}
            onChange={(e) => setForm({ ...form, detailed_description: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Price (₹) *"
              type="number"
              min={0}
              className="rounded-lg border px-3 py-2"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <input
              placeholder="Compare Price (₹)"
              type="number"
              min={0}
              className="rounded-lg border px-3 py-2"
              value={form.compare_price}
              onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Product Status</p>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as ProductStatus })
              }
            >
              {PRODUCT_STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            />
            Featured Product
          </label>

          <section className="card-store space-y-4">
            <h2 className="font-semibold text-primary">Category Information</h2>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Category *</p>
              <CategorySelect
                value={form.category_id}
                onChange={(category_id) =>
                  setForm((f) => ({ ...f, category_id, sub_category_id: "" }))
                }
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Sub Category *</p>
              <SubCategoryField
                categoryId={form.category_id}
                value={form.sub_category_id}
                onChange={(sub_category_id) => setForm((f) => ({ ...f, sub_category_id }))}
              />
            </div>
          </section>

          <ProductAttributesSection
            occasion={form.occasion}
            fabric={form.fabric}
            neck_type={form.neck_type}
            sleeve_type={form.sleeve_type}
            closure_type={form.closure_type}
            onOccasionChange={(occasion) => setForm((f) => ({ ...f, occasion }))}
            onFieldChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
          />

          <section className="card-store space-y-3">
            <h2 className="font-semibold text-primary">Colors</h2>
            <ColorPicker
              selected={form.color_swatches}
              onChange={(color_swatches) => setForm((f) => ({ ...f, color_swatches }))}
            />
          </section>

          <section className="card-store space-y-3">
            <h2 className="font-semibold text-primary">Sizes</h2>
            <SizePicker
              selected={form.sizes}
              onChange={(sizes) => setForm((f) => ({ ...f, sizes }))}
            />
          </section>

          <section className="card-store space-y-4">
            <h2 className="font-semibold text-primary">Inventory</h2>
            <ProductVariantMatrix variants={variants} onChange={setVariants} />
          </section>

          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
            {saving ? "Saving…" : "SAVE CHANGES"}
          </button>
        </div>

        <div className="space-y-6">
          <div className="card-store h-fit space-y-3">
            <p className="font-semibold text-red-700">Danger Zone</p>
            <p className="text-xs text-foreground/70">
              Type <span className="font-semibold">{form.name}</span> below to delete this product.
            </p>
            <input
              type="text"
              placeholder="Product name"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <button
              type="button"
              disabled={deleting || deleteConfirm !== form.name}
              onClick={handleDelete}
              className="w-full rounded-full border border-red-600 py-2 text-sm font-bold text-red-600 disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "DELETE PRODUCT"}
            </button>
          </div>

          <Link href="/admin/products" className="btn-outline block text-center text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
