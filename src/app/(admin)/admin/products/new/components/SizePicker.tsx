"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { SIZE_CHART_CONFIG } from "@/config/size-chart";

const STANDARD_SIZES = SIZE_CHART_CONFIG.sizes
  .filter((s) => ["XS32", "S34", "M36", "L38", "XL40", "XXL42"].includes(s.slug))
  .map((s) => ({ label: s.label, short: s.label.split("(")[0] }));

type SizePickerProps = {
  selected: string[];
  onChange: (sizes: string[]) => void;
};

export function SizePicker({ selected, onChange }: SizePickerProps) {
  const [customSize, setCustomSize] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>([]);

  const standardLabels = STANDARD_SIZES.map((s) => s.label);
  const allOptions = [
    ...standardLabels,
    ...customOptions.filter((s) => !standardLabels.includes(s))
  ];

  const toggle = (size: string) => {
    onChange(
      selected.includes(size) ? selected.filter((s) => s !== size) : [...selected, size]
    );
  };

  const addCustomSize = () => {
    const size = customSize.trim();
    if (!size) {
      toast.error("Enter a size");
      return;
    }
    if (allOptions.some((s) => s.toLowerCase() === size.toLowerCase())) {
      const match = allOptions.find((s) => s.toLowerCase() === size.toLowerCase());
      if (match && !selected.includes(match)) onChange([...selected, match]);
      setCustomSize("");
      return;
    }
    setCustomOptions((prev) => [...prev, size]);
    onChange([...selected, size]);
    setCustomSize("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STANDARD_SIZES.map(({ label, short }) => (
          <button
            key={label}
            type="button"
            onClick={() => toggle(label)}
            title={label}
            className={`min-w-[3rem] rounded-lg px-3 py-2 text-xs font-semibold transition ${
              selected.includes(label)
                ? "bg-primary text-white shadow-sm"
                : "border border-accent/30 bg-white text-foreground/80 hover:border-primary/40"
            }`}
          >
            {short}
          </button>
        ))}
        {customOptions.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => toggle(size)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              selected.includes(size)
                ? "bg-primary text-white shadow-sm"
                : "border border-accent/30 bg-white text-foreground/80 hover:border-primary/40"
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Custom size (e.g. 3XL(44))"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          value={customSize}
          onChange={(e) => setCustomSize(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomSize();
            }
          }}
        />
        <button
          type="button"
          onClick={addCustomSize}
          className="btn-outline inline-flex shrink-0 items-center gap-1 px-4"
        >
          <Plus className="h-4 w-4" />
          Add size
        </button>
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-foreground/50">
          Selected: {selected.join(", ")}
        </p>
      )}
    </div>
  );
}
