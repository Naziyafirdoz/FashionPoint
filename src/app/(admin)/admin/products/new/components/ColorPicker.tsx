"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { isValidHex, normalizeHex } from "@/lib/products/color-swatches";
import type { ProductColorSwatch } from "@/types";
import { ADMIN_COLOR_PRESETS } from "./color-presets";

type ColorPickerProps = {
  selected: ProductColorSwatch[];
  onChange: (colors: ProductColorSwatch[]) => void;
};

const DEFAULT_HEX = "#7B0D2B";

function pickerValue(hex: string | null | undefined, fallback = DEFAULT_HEX): string {
  if (hex && isValidHex(hex)) {
    return normalizeHex(hex) ?? fallback;
  }
  return fallback;
}

function previewColor(hex: string | null | undefined): string {
  if (hex && isValidHex(hex)) {
    return normalizeHex(hex)!;
  }
  return "#F3F3F3";
};

type ColorRowProps = {
  name: string;
  hex: string | null;
  nameError?: string;
  hexError?: string;
  onNameChange: (value: string) => void;
  onHexChange: (value: string | null) => void;
  onRemove?: () => void;
  showRemove?: boolean;
};

function ColorRow({
  name,
  hex,
  nameError,
  hexError,
  onNameChange,
  onHexChange,
  onRemove,
  showRemove = false
}: ColorRowProps) {
  const handlePickerChange = (value: string) => {
    onHexChange(value.toUpperCase());
  };

  const handleHexInputChange = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      onHexChange(null);
      return;
    }
    const normalized = normalizeHex(trimmed);
    onHexChange(normalized ?? trimmed);
  };

  const handleHexBlur = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      onHexChange(null);
      return;
    }
    const normalized = normalizeHex(trimmed);
    if (normalized) {
      onHexChange(normalized);
    }
  };

  return (
    <div className="rounded-xl border border-accent/25 bg-[#FFFBF9] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-2 sm:pt-6">
          <span
            className="h-14 w-14 rounded-full border-2 border-[#D8D8D8] shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors duration-200"
            style={{ backgroundColor: previewColor(hex) }}
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
            Preview
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-primary">
              Color Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g. Olive Green"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                nameError ? "border-red-400" : ""
              }`}
            />
            {nameError ? <p className="mt-1 text-xs text-red-600">{nameError}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-primary">
              Color <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={pickerValue(hex)}
                onChange={(event) => handlePickerChange(event.target.value)}
                className="h-12 w-14 cursor-pointer rounded-lg border border-accent/30 bg-white p-1"
                aria-label={`Pick color for ${name || "new color"}`}
              />
              <p className="text-xs leading-relaxed text-foreground/55">
                Choose the closest shade. The HEX value updates automatically.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground/70">
              HEX <span className="font-normal text-foreground/45">(auto-generated)</span>
            </label>
            <input
              type="text"
              value={hex ?? ""}
              placeholder="#556B2F"
              onChange={(event) => handleHexInputChange(event.target.value)}
              onBlur={(event) => handleHexBlur(event.target.value)}
              className={`w-full max-w-xs rounded-lg border bg-white px-3 py-2.5 font-mono text-sm ${
                hexError ? "border-red-400" : ""
              }`}
            />
            {hexError ? (
              <p className="mt-1 text-xs text-red-600">{hexError}</p>
            ) : (
              <p className="mt-1 text-[11px] text-foreground/45">
                Advanced: edit HEX for an exact shade.
              </p>
            )}
          </div>
        </div>

        {showRemove && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 sm:mt-6"
            aria-label={`Remove ${name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ColorPicker({ selected, onChange }: ColorPickerProps) {
  const [nameInput, setNameInput] = useState("");
  const [hexInput, setHexInput] = useState<string | null>(DEFAULT_HEX);
  const [nameError, setNameError] = useState("");
  const [hexError, setHexError] = useState("");
  const [presetSearch, setPresetSearch] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<number, { name?: string; hex?: string }>>({});

  const filteredPresets = useMemo(() => {
    const query = presetSearch.trim().toLowerCase();
    if (!query) return ADMIN_COLOR_PRESETS;
    return ADMIN_COLOR_PRESETS.filter((preset) => preset.name.toLowerCase().includes(query));
  }, [presetSearch]);

  const applyPreset = (preset: (typeof ADMIN_COLOR_PRESETS)[number]) => {
    setNameInput(preset.name);
    setHexInput(preset.hex);
    setNameError("");
    setHexError("");
  };

  const validateNewColor = (): boolean => {
    let valid = true;
    const name = nameInput.trim();

    if (!name) {
      setNameError("Please enter a color name.");
      valid = false;
    } else {
      setNameError("");
    }

    if (!hexInput || !isValidHex(hexInput)) {
      setHexError("Please enter a valid HEX color.");
      valid = false;
    } else {
      setHexError("");
    }

    return valid;
  };

  const addColor = () => {
    if (!validateNewColor()) return;

    const name = nameInput.trim();
    const hex = normalizeHex(hexInput!)!;

    if (selected.some((swatch) => swatch.name.toLowerCase() === name.toLowerCase())) {
      toast.error("This color is already added");
      return;
    }

    onChange([...selected, { name, hex }]);
    setNameInput("");
    setHexInput(DEFAULT_HEX);
    setNameError("");
    setHexError("");
  };

  const updateSwatch = (index: number, patch: Partial<ProductColorSwatch>) => {
    onChange(
      selected.map((swatch, currentIndex) =>
        currentIndex === index ? { ...swatch, ...patch } : swatch
      )
    );

    if (patch.name !== undefined || patch.hex !== undefined) {
      setRowErrors((current) => {
        const next = { ...current };
        delete next[index];
        return next;
      });
    }
  };

  const validateRow = (index: number) => {
    const swatch = selected[index];
    if (!swatch) return;

    const errors: { name?: string; hex?: string } = {};

    if (!swatch.name.trim()) {
      errors.name = "Please enter a color name.";
    }

    if (!swatch.hex || !isValidHex(swatch.hex)) {
      errors.hex = "Please enter a valid HEX color.";
    }

    setRowErrors((current) => ({ ...current, [index]: errors }));
  };

  const removeSwatch = (index: number) => {
    onChange(selected.filter((_, currentIndex) => currentIndex !== index));
    setRowErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {selected.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Added colors ({selected.length})
          </p>
          {selected.map((swatch, index) => (
            <div key={`${swatch.name}-${index}`} onBlur={() => validateRow(index)}>
              <ColorRow
                name={swatch.name}
                hex={swatch.hex ?? null}
                nameError={rowErrors[index]?.name}
                hexError={rowErrors[index]?.hex}
                onNameChange={(value) => updateSwatch(index, { name: value })}
                onHexChange={(value) =>
                  updateSwatch(index, {
                    hex: value && isValidHex(value) ? normalizeHex(value) : value
                  })
                }
                onRemove={() => removeSwatch(index)}
                showRemove
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-accent/25 bg-white/60 px-4 py-3 text-sm text-foreground/60">
          No colors added yet. Use the form below to add your first color.
        </p>
      )}

      <div className="space-y-4 rounded-xl border border-dashed border-accent/35 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-primary">Add a color</h3>
        </div>

        <ColorRow
          name={nameInput}
          hex={hexInput}
          nameError={nameError}
          hexError={hexError}
          onNameChange={(value) => {
            setNameInput(value);
            if (value.trim()) setNameError("");
          }}
          onHexChange={(value) => {
            setHexInput(value);
            if (value && isValidHex(value)) setHexError("");
          }}
        />

        <button
          type="button"
          onClick={addColor}
          className="btn-outline inline-flex h-10 items-center gap-1.5 px-4"
        >
          <Plus className="h-4 w-4" />
          Add color
        </button>

        <div className="border-t border-accent/20 pt-4">
          <p className="mb-2 text-xs font-semibold text-foreground/70">
            Quick color suggestions <span className="font-normal">(optional)</span>
          </p>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              type="search"
              value={presetSearch}
              onChange={(event) => setPresetSearch(event.target.value)}
              placeholder="Search colors…"
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
              aria-label="Search color suggestions"
            />
          </div>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
            {filteredPresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-[#FFFBF9] px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/35 hover:bg-white"
              >
                <span
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.hex }}
                  aria-hidden="true"
                />
                {preset.name}
              </button>
            ))}
            {filteredPresets.length === 0 ? (
              <p className="text-xs text-foreground/50">No matching colors found.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
