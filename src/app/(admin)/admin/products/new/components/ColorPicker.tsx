"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

const PRESET_COLORS = ["Pink", "Maroon", "Red", "Gold", "Green", "Blue", "Black", "White"];

type ColorPickerProps = {
  selected: string[];
  onChange: (colors: string[]) => void;
};

export function ColorPicker({ selected, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>([]);

  const allOptions = [...PRESET_COLORS, ...customOptions.filter((c) => !PRESET_COLORS.includes(c))];

  const toggle = (color: string) => {
    onChange(
      selected.includes(color) ? selected.filter((c) => c !== color) : [...selected, color]
    );
  };

  const addCustomColor = () => {
    const color = customColor.trim();
    if (!color) {
      toast.error("Enter a color name");
      return;
    }
    if (allOptions.some((c) => c.toLowerCase() === color.toLowerCase())) {
      if (!selected.includes(color)) {
        const match = allOptions.find((c) => c.toLowerCase() === color.toLowerCase());
        if (match) onChange([...selected, match]);
      }
      setCustomColor("");
      return;
    }
    setCustomOptions((prev) => [...prev, color]);
    onChange([...selected, color]);
    setCustomColor("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allOptions.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => toggle(color)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selected.includes(color)
                ? "bg-primary text-white shadow-sm"
                : "border border-accent/30 bg-white text-foreground/80 hover:border-primary/40"
            }`}
          >
            {color}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Custom color (e.g. Peach)"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomColor();
            }
          }}
        />
        <button
          type="button"
          onClick={addCustomColor}
          className="btn-outline inline-flex shrink-0 items-center gap-1 px-4"
        >
          <Plus className="h-4 w-4" />
          Add color
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
