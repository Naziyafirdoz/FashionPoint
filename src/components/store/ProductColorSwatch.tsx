"use client";

import {
  getSwatchBackgroundStyle,
  getSwatchBorderClass
} from "@/lib/products/color-swatches";

type ProductColorSwatchProps = {
  name: string;
  hex?: string | null;
  selected?: boolean;
  onClick?: () => void;
  size?: "md" | "lg";
};

const SIZE_CLASS = {
  md: "h-7 w-7",
  lg: "h-8 w-8"
};

const SELECTED_SWATCH_CLASS =
  "border-[2.5px] border-primary shadow-[inset_0_0_0_2px_#ffffff,0_4px_12px_rgba(123,13,43,0.22)]";

export function ProductColorSwatch({
  name,
  hex,
  selected = false,
  onClick,
  size = "lg"
}: ProductColorSwatchProps) {
  const interactive = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      title={name}
      aria-label={`Select color ${name}`}
      aria-pressed={selected}
      className={`${SIZE_CLASS[size]} shrink-0 rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        interactive ? "cursor-pointer hover:scale-110 hover:shadow-[0_3px_10px_rgba(0,0,0,0.12)]" : "cursor-default"
      } ${selected ? SELECTED_SWATCH_CLASS : getSwatchBorderClass(hex, false)}`}
      style={getSwatchBackgroundStyle(hex)}
    />
  );
}
