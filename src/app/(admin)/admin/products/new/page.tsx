"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductVariantMatrix } from "@/components/admin/products/ProductVariantMatrix";
import {
  buildAdminVariantMatrixRows,
  mergeVariantMatrixRows,
  type AdminVariantMatrixRow
} from "@/lib/admin/products";
import { slugify } from "@/lib/product-filters";
import { PRODUCT_STATUS_OPTIONS, type ProductStatus } from "@/lib/products/status";
import { CategoryField } from "./components/CategoryField";
import { SubCategoryField } from "@/components/admin/SubCategoryField";
import { ProductAttributesSection } from "@/components/admin/products/ProductAttributesSection";
import { ColorPicker } from "./components/ColorPicker";
import { colorNamesFromSwatches } from "@/lib/products/color-swatches";
import type { ProductColorSwatch } from "@/types";
import { MediaUploader } from "./components/MediaUploader";
import { SizePicker } from "./components/SizePicker";

const VIDEO_TAG_PREFIX = "__video__:";

const sectionCardClass =
  "min-w-0 w-full rounded-xl border border-accent/30 bg-white p-5 shadow-card sm:p-6";

const leftColumnWrapperClass =
  "contents xl:col-start-1 xl:flex xl:min-w-0 xl:w-full xl:flex-col xl:gap-6";

const rightColumnWrapperClass =
  "contents xl:col-start-2 xl:flex xl:min-w-0 xl:w-full xl:flex-col xl:gap-6";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [variants, setVariants] = useState<AdminVariantMatrixRow[]>([]);
  const [form, setForm] = useState({
    name: "",
    short_description: "",
    detailed_description: "",
    price: "",
    compare_price: "",
    category_id: "",
    sub_category_id: "",
    fabric: "Silk",
    neck_type: "Round",
    sleeve_type: "Half",
    closure_type: "",
    color_swatches: [] as ProductColorSwatch[],
    sizes: [] as string[],
    occasion: [] as string[],
    status: "draft" as ProductStatus,
    is_featured: false,
    ai_size_enabled: true,
    ai_color_enabled: true
  });

  useEffect(() => {
    const colorNames = colorNamesFromSwatches(form.color_swatches);
    const basePrice = Number(form.price) || 0;
    const baseCompare = form.compare_price ? Number(form.compare_price) : null;
    setVariants((prev) => {
      const next = buildAdminVariantMatrixRows(form.sizes, colorNames, [], {
        price: basePrice,
        compare_price: baseCompare
      });
      return mergeVariantMatrixRows(next, prev);
    });
  }, [form.sizes, form.color_swatches, form.price, form.compare_price]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    if (!form.category_id) {
      toast.error("Select or create a category");
      return;
    }
    if (!form.color_swatches.length || !form.sizes.length) {
      toast.error("Select at least one color and size");
      return;
    }

    setSaving(true);
    try {
      const slug = slugify(form.name);
      const colorNames = colorNamesFromSwatches(form.color_swatches);
      const videoTags = videos.map((url) => `${VIDEO_TAG_PREFIX}${url}`);
      const payload = {
        name: form.name.trim(),
        slug,
        short_description: form.short_description.trim(),
        detailed_description: form.detailed_description.trim() || form.short_description.trim(),
        category_id: form.category_id,
        sub_category_id: form.sub_category_id || null,
        price: Number(form.price),
        compare_price: form.compare_price ? Number(form.compare_price) : null,
        fabric: form.fabric,
        neck_type: form.neck_type,
        sleeve_type: form.sleeve_type,
        closure_type: form.closure_type.trim() || null,
        colors: colorNames,
        color_swatches: form.color_swatches,
        sizes: form.sizes,
        occasion: form.occasion,
        status: form.status,
        is_featured: form.is_featured,
        images,
        tags: videoTags.length > 0 ? videoTags : undefined,
        variants: variants.map((v) => ({
          size: v.size,
          color: v.color,
          price: v.price,
          compare_price: v.compare_price,
          stock_quantity: v.stock_quantity,
          sku: v.sku.trim() || null
        })),
        is_bestseller: false,
        is_new: true,
        ai_size_enabled: form.ai_size_enabled,
        ai_color_enabled: form.ai_color_enabled,
        ai_style_enabled: false
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to save product");
        return;
      }

      toast.success("Product saved!");
      router.push("/admin/products");
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-none">
      <AdminHeader title="Add Product" />
      <form
        onSubmit={handleSave}
        className="flex w-full max-w-none flex-col gap-6 p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start xl:gap-6"
      >
        <div className={leftColumnWrapperClass}>
          <section className={`${sectionCardClass} max-xl:order-1 space-y-4`}>
            <h2 className="font-semibold text-primary">Media</h2>
            <MediaUploader
              images={images}
              videos={videos}
              onImagesChange={setImages}
              onVideosChange={setVideos}
            />
          </section>

          <section className={`${sectionCardClass} max-xl:order-2 space-y-4`}>
            <h2 className="font-semibold text-primary">Product details</h2>
            <input
              required
              placeholder="Product Name *"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <textarea
              required
              placeholder="Short Description *"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
            />
            <textarea
              placeholder="Detailed Description"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={4}
              value={form.detailed_description}
              onChange={(e) => setForm({ ...form, detailed_description: e.target.value })}
            />
          </section>

          <section className={`${sectionCardClass} max-xl:order-3 space-y-4`}>
            <h2 className="font-semibold text-primary">Default pricing</h2>
            <p className="text-xs text-foreground/50">
              Base price and compare price — applied to new matrix rows. Override per variant below.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/60">
                  Price (₹) *
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground/60">
                  Compare Price (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.compare_price}
                  onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">
                Product Status
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
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
                className="rounded border-accent/40"
              />
              Featured Product
            </label>
          </section>

          <section className={`${sectionCardClass} max-xl:order-4 space-y-4`}>
            <h2 className="font-semibold text-primary">Category Information</h2>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Category *</p>
              <CategoryField
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

          <section className={`${sectionCardClass} max-xl:order-9 space-y-3`}>
            <h2 className="font-semibold text-primary">AI store features</h2>
            <p className="text-xs text-foreground/50">
              Enable AI tools for customers on this product page.
            </p>
            {(["ai_size_enabled", "ai_color_enabled"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="rounded border-accent/40"
                />
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
              </label>
            ))}
          </section>

          <section className={`${sectionCardClass} max-xl:order-10 space-y-3 text-sm text-foreground/60`}>
            <h2 className="font-semibold text-primary">Tips</h2>
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>Add up to 8 product images for the gallery</li>
              <li>Videos are optional (max 2)</li>
              <li>Set different prices per size in the matrix</li>
            </ul>
          </section>
        </div>

        <div className={rightColumnWrapperClass}>
          <div className="min-w-0 w-full max-xl:order-5">
            <ProductAttributesSection
              occasion={form.occasion}
              fabric={form.fabric}
              neck_type={form.neck_type}
              sleeve_type={form.sleeve_type}
              closure_type={form.closure_type}
              onOccasionChange={(occasion) => setForm((f) => ({ ...f, occasion }))}
              onFieldChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
            />
          </div>

          <section className={`${sectionCardClass} max-xl:order-6 space-y-3`}>
            <h2 className="font-semibold text-primary">Colors</h2>
            <ColorPicker
              selected={form.color_swatches}
              onChange={(color_swatches) => setForm((f) => ({ ...f, color_swatches }))}
            />
          </section>

          <section className={`${sectionCardClass} max-xl:order-7 space-y-3`}>
            <h2 className="font-semibold text-primary">Sizes</h2>
            <SizePicker selected={form.sizes} onChange={(sizes) => setForm((f) => ({ ...f, sizes }))} />
          </section>

          <section className={`${sectionCardClass} max-xl:order-8 space-y-4`}>
            <h2 className="font-semibold text-primary">Inventory</h2>
            <ProductVariantMatrix variants={variants} onChange={setVariants} />
          </section>

          <div
            className={`${sectionCardClass} max-xl:order-11 w-full !border-0 !bg-transparent !p-0 !shadow-none`}
          >
            <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
              {saving ? "Saving…" : "Save Product"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
