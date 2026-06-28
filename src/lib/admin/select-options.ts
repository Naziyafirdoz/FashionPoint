type SelectOptionIdentity = {
  id: string;
  slug?: string | null;
};

export function dedupeSelectOptions<T extends SelectOptionIdentity>(items: T[]): T[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const id = item.id?.trim();
    if (!id || seenIds.has(id)) continue;

    const slugKey = item.slug?.trim().toLowerCase();
    if (slugKey && seenSlugs.has(slugKey)) continue;

    seenIds.add(id);
    if (slugKey) seenSlugs.add(slugKey);
    result.push(item);
  }

  return result;
}

export function sortBySortOrderThenName<T extends { sort_order?: number; name: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}
