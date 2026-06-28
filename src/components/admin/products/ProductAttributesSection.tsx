"use client";

import { useMemo, useState } from "react";
import { Check, Lightbulb, Plus, Sparkles, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { OCCASION_OPTIONS } from "@/lib/products/constants";

type ProductAttributesSectionProps = {
  occasion: string[];
  fabric: string;
  neck_type: string;
  sleeve_type: string;
  closure_type: string;
  onOccasionChange: (occasion: string[]) => void;
  onFieldChange: (
    field: "fabric" | "neck_type" | "sleeve_type" | "closure_type",
    value: string
  ) => void;
};

const PRESET_OCCASIONS = [...OCCASION_OPTIONS];

const inputShellClassName =
  "relative flex h-[52px] w-full items-center rounded-xl border border-gray-200 bg-white transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(123,13,43,0.12)]";

const inputClassName =
  "h-full w-full rounded-xl border-0 bg-transparent py-0 pl-4 pr-11 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-0";

type AttributeFieldProps = {
  id: string;
  label: React.ReactNode;
  helper: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function AttributeField({ id, label, helper, placeholder, value, onChange }: AttributeFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className={inputShellClassName}>
        <input
          id={id}
          type="text"
          className={inputClassName}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Sparkles
          className="pointer-events-none absolute right-4 h-4 w-4 text-primary/35"
          aria-hidden
        />
      </div>
      <p className="mt-2 text-sm text-foreground/55">{helper}</p>
    </div>
  );
}

type OccasionChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
};

function OccasionChip({ label, selected, onToggle }: OccasionChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={`relative flex h-14 w-full items-center gap-3 rounded-[14px] px-4 text-left text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
        selected
          ? "bg-gradient-to-br from-[#8f1535] via-primary to-[#5a081f] text-white shadow-[0_8px_20px_rgba(123,13,43,0.22)] hover:shadow-[0_10px_24px_rgba(123,13,43,0.28)]"
          : "border border-gray-200 bg-white text-foreground hover:border-primary/35 hover:bg-[#fff9fb]"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
          selected ? "bg-white/15 text-white" : "border border-gray-200 bg-gray-50 text-gray-400"
        }`}
      >
        {selected ? <Tag className="h-4 w-4" strokeWidth={2.25} /> : <Tag className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export function ProductAttributesSection({
  occasion,
  fabric,
  neck_type,
  sleeve_type,
  closure_type,
  onOccasionChange,
  onFieldChange
}: ProductAttributesSectionProps) {
  const [showCustomOccasion, setShowCustomOccasion] = useState(false);
  const [customOccasionDraft, setCustomOccasionDraft] = useState("");
  const [customOccasionOptions, setCustomOccasionOptions] = useState<string[]>([]);

  const allOccasionOptions = useMemo(() => {
    const extras = new Set<string>();
    for (const value of customOccasionOptions) {
      if (!(PRESET_OCCASIONS as readonly string[]).includes(value)) {
        extras.add(value);
      }
    }
    for (const value of occasion) {
      if (!(PRESET_OCCASIONS as readonly string[]).includes(value)) {
        extras.add(value);
      }
    }
    return [...PRESET_OCCASIONS, ...Array.from(extras)];
  }, [occasion, customOccasionOptions]);

  const toggleOccasion = (option: string) => {
    onOccasionChange(
      occasion.includes(option) ? occasion.filter((o) => o !== option) : [...occasion, option]
    );
  };

  const addCustomOccasion = () => {
    const value = customOccasionDraft.trim();
    if (!value) {
      toast.error("Enter an occasion name");
      return;
    }

    const existing = allOccasionOptions.find((o) => o.toLowerCase() === value.toLowerCase());
    if (existing) {
      if (!occasion.includes(existing)) {
        onOccasionChange([...occasion, existing]);
      }
      setCustomOccasionDraft("");
      setShowCustomOccasion(false);
      return;
    }

    setCustomOccasionOptions((prev) => [...prev, value]);
    onOccasionChange([...occasion, value]);
    setCustomOccasionDraft("");
    setShowCustomOccasion(false);
  };

  return (
    <section className="rounded-[18px] border border-accent/25 bg-white p-8 shadow-[0_10px_40px_rgba(123,13,43,0.06)]">
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-primary">Product Attributes</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/55">
          Add key details about this product to help customers find the right one.
        </p>
      </div>

      <div className="space-y-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5">
            <p className="text-base font-semibold text-foreground">Occasion</p>
            <p className="mt-1 text-sm text-foreground/55">Select all that apply</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {allOccasionOptions.map((option) => (
              <OccasionChip
                key={option}
                label={option}
                selected={occasion.includes(option)}
                onToggle={() => toggleOccasion(option)}
              />
            ))}
          </div>

          <div className="mt-6">
            {!showCustomOccasion ? (
              <button
                type="button"
                onClick={() => setShowCustomOccasion(true)}
                className="inline-flex items-center gap-2 rounded-full border-2 border-primary/25 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-all duration-150 hover:border-primary hover:bg-[#fff5f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Add Custom Occasion
              </button>
            ) : (
              <div className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-center">
                <div className={`${inputShellClassName} sm:flex-1`}>
                  <input
                    type="text"
                    autoFocus
                    className={inputClassName}
                    placeholder="Custom occasion name"
                    value={customOccasionDraft}
                    onChange={(e) => setCustomOccasionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomOccasion();
                      }
                      if (e.key === "Escape") {
                        setShowCustomOccasion(false);
                        setCustomOccasionDraft("");
                      }
                    }}
                  />
                  <Sparkles className="pointer-events-none absolute right-4 h-4 w-4 text-primary/35" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={addCustomOccasion}
                  className="btn-primary shrink-0 px-5 py-2.5 text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomOccasion(false);
                    setCustomOccasionDraft("");
                  }}
                  className="text-sm font-medium text-foreground/55 transition-colors duration-150 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <AttributeField
          id="product-fabric"
          label={
            <>
              Fabric <span className="text-primary">*</span>
            </>
          }
          placeholder="e.g. Silk, Cotton, Velvet"
          helper="Enter the main fabric of the blouse."
          value={fabric}
          onChange={(value) => onFieldChange("fabric", value)}
        />

        <AttributeField
          id="product-neck-type"
          label={
            <>
              Neck Type <span className="text-primary">*</span>
            </>
          }
          placeholder="e.g. Round Neck, Boat Neck, V Neck"
          helper="Describe the neckline style."
          value={neck_type}
          onChange={(value) => onFieldChange("neck_type", value)}
        />

        <AttributeField
          id="product-sleeve-type"
          label={
            <>
              Sleeve Type <span className="text-primary">*</span>
            </>
          }
          placeholder="e.g. Sleeveless, Half Sleeve, 3/4 Sleeve, Full Sleeve"
          helper="Describe the sleeve length and style."
          value={sleeve_type}
          onChange={(value) => onFieldChange("sleeve_type", value)}
        />

        <AttributeField
          id="product-closure-type"
          label={
            <>
              Closure Type <span className="font-normal text-foreground/50">(Optional)</span>
            </>
          }
          placeholder="e.g. Hooks, Back Open, Front Open, Tie-Up"
          helper="Describe how the blouse is closed."
          value={closure_type}
          onChange={(value) => onFieldChange("closure_type", value)}
        />

        <div className="rounded-2xl border border-accent/20 bg-[#fff5f7]/80 p-5">
          <div className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
              <Lightbulb className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">Tips for better product discovery</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">
                Use clear and specific details. Example:{" "}
                <span className="font-medium text-foreground/75">
                  &quot;Silk&quot;, &quot;Round Neck&quot;, &quot;Half Sleeve&quot;, &quot;Back Open&quot;
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
