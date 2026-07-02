"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  isExploreCollectionsHash,
  scrollToExploreCollections
} from "@/lib/navigation/explore-collections";

function scrollToSectionIfHashPresent() {
  if (!isExploreCollectionsHash(window.location.hash)) return;

  requestAnimationFrame(() => {
    scrollToExploreCollections("smooth");
  });
}

export function ExploreCollectionsScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    scrollToSectionIfHashPresent();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") return;

    const onHashChange = () => scrollToSectionIfHashPresent();

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") return;

    const onPopState = () => scrollToSectionIfHashPresent();

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [pathname]);

  return null;
}
