import type { MouseEvent } from "react";

export const EXPLORE_COLLECTIONS_ID = "explore-our-collections";

export const EXPLORE_COLLECTIONS_HREF = `/#${EXPLORE_COLLECTIONS_ID}`;

const SCROLL_RETRY_FRAMES = 24;

export function scrollToExploreCollections(behavior: ScrollBehavior = "smooth") {
  const scroll = (framesLeft: number) => {
    const section = document.getElementById(EXPLORE_COLLECTIONS_ID);
    if (section) {
      section.scrollIntoView({ behavior, block: "start" });
      return;
    }

    if (framesLeft > 0) {
      requestAnimationFrame(() => scroll(framesLeft - 1));
    }
  };

  scroll(SCROLL_RETRY_FRAMES);
}

export function isExploreCollectionsHash(hash: string) {
  const normalized = hash.trim().toLowerCase();
  return normalized === `#${EXPLORE_COLLECTIONS_ID}` || normalized === "#explore-collections";
}

/** Smooth-scroll on the home page; allow default navigation from other routes. */
export function handleExploreCollectionsClick(event: MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;

  event.preventDefault();
  const nextUrl = `${window.location.pathname}${window.location.search}#${EXPLORE_COLLECTIONS_ID}`;
  window.history.pushState(null, "", nextUrl);
  scrollToExploreCollections("smooth");
}
