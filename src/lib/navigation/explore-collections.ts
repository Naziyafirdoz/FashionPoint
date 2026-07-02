import type { MouseEvent } from "react";

export const EXPLORE_COLLECTIONS_ID = "explore-collections";

export const EXPLORE_COLLECTIONS_HREF = `/#${EXPLORE_COLLECTIONS_ID}`;

export function scrollToExploreCollections(behavior: ScrollBehavior = "smooth") {
  document.getElementById(EXPLORE_COLLECTIONS_ID)?.scrollIntoView({
    behavior,
    block: "start"
  });
}

export function isExploreCollectionsHash(hash: string) {
  return hash === `#${EXPLORE_COLLECTIONS_ID}`;
}

/** Smooth-scroll on the home page; allow default navigation from other routes. */
export function handleExploreCollectionsClick(event: MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;

  event.preventDefault();
  const nextUrl = `${window.location.pathname}${window.location.search}#${EXPLORE_COLLECTIONS_ID}`;
  window.history.pushState(null, "", nextUrl);
  scrollToExploreCollections("smooth");
}
