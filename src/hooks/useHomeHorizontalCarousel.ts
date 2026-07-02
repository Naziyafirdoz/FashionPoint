"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Shared with Explore Our Collections carousel spacing. */
export const HOME_CAROUSEL_CARD_GAP = 16;

export const HOME_CAROUSEL_ARROW_CLASSNAME =
  "absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.08] bg-white text-foreground/70 shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 hover:border-primary/20 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:h-11 sm:w-11";

export const HOME_CAROUSEL_TRACK_CLASSNAME =
  "mx-auto flex items-start gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory px-10 sm:px-14 lg:px-0";

type UseHomeHorizontalCarouselOptions = {
  itemCount: number;
  itemWidth: number;
  enabled: boolean;
};

export function useHomeHorizontalCarousel({
  itemCount,
  itemWidth,
  enabled
}: UseHomeHorizontalCarouselOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !enabled) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    setCanScrollPrev(container.scrollLeft > 4);
    setCanScrollNext(container.scrollLeft < maxScroll - 4);
  }, [enabled]);

  useEffect(() => {
    updateScrollState();
    if (!enabled) return;

    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [itemCount, enabled, updateScrollState]);

  const scrollByDirection = useCallback(
    (direction: -1 | 1) => {
      const container = scrollRef.current;
      if (!container || !enabled) return;

      const scrollAmount = Math.max(
        container.clientWidth * 0.75,
        itemWidth + HOME_CAROUSEL_CARD_GAP
      );
      container.scrollBy({ left: scrollAmount * direction, behavior: "smooth" });
    },
    [enabled, itemWidth]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enabled) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollByDirection(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollByDirection(1);
      }
    },
    [enabled, scrollByDirection]
  );

  const isCarouselDragTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return true;
    return !target.closest("a, button, input, textarea, select, [role='link']");
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !isCarouselDragTarget(event.target)) return;

    const container = scrollRef.current;
    if (!container) return;

    setIsDragging(true);
    dragState.current = {
      startX: event.clientX,
      scrollLeft: container.scrollLeft
    };
    container.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !isDragging) return;
    const container = scrollRef.current;
    if (!container) return;

    const delta = event.clientX - dragState.current.startX;
    container.scrollLeft = dragState.current.scrollLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    scrollRef.current?.releasePointerCapture(event.pointerId);
  };

  const trackClassName = `${HOME_CAROUSEL_TRACK_CLASSNAME} ${
    enabled ? (isDragging ? "cursor-grabbing select-none" : "cursor-grab") : ""
  }`;

  return {
    scrollRef,
    canScrollPrev,
    canScrollNext,
    scrollByDirection,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    trackClassName
  };
}

export function getCarouselArrowVisibilityClassName(visible: boolean) {
  return visible
    ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
    : "pointer-events-none translate-x-0 scale-95 opacity-0";
}
