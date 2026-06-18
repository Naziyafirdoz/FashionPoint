export type ImageSlot = "full-saree" | "pallu" | "border" | "embroidery" | "close-up";

export const IMAGE_SLOT_ORDER: ImageSlot[] = [
  "full-saree",
  "pallu",
  "border",
  "embroidery",
  "close-up"
];

export const IMAGE_SLOT_LABELS: Record<ImageSlot, string> = {
  "full-saree": "Full Saree",
  pallu: "Pallu",
  border: "Border",
  embroidery: "Embroidery",
  "close-up": "Close-up"
};

export function slotForIndex(index: number): ImageSlot {
  return IMAGE_SLOT_ORDER[Math.min(index, IMAGE_SLOT_ORDER.length - 1)];
}

export function isBorderSlot(slot: ImageSlot): boolean {
  return slot === "pallu" || slot === "border";
}

export function isEmbroiderySlot(slot: ImageSlot): boolean {
  return slot === "embroidery" || slot === "close-up";
}

export function isFabricSlot(slot: ImageSlot): boolean {
  return slot === "full-saree";
}
