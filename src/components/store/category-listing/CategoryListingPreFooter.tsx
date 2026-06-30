"use client";

export function CategoryListingPreFooter() {
  return (
    <section className="border-t border-[#F2E4E8] bg-[#FFF8F8] py-3">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-3 px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-center lg:text-left">
          <h2 className="font-display text-[1.35rem] font-bold leading-tight text-[#7B0D2B]">
            Stay Updated
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#777777]">
            Subscribe for new arrivals,
            <br className="hidden sm:inline" /> offers &amp; more.
          </p>
        </div>

        <form
          className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:gap-3 lg:max-w-2xl lg:flex-1 lg:justify-end"
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            type="email"
            disabled
            aria-disabled="true"
            placeholder="Newsletter signup coming soon"
            className="h-11 flex-1 cursor-not-allowed rounded-xl border border-[#F2E4E8] bg-[#FAFAFA] px-4 text-sm text-[#999999] shadow-[0_1px_3px_rgba(122,13,43,0.05)]"
          />
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Newsletter signup is not available yet"
            className="btn-primary h-11 shrink-0 cursor-not-allowed rounded-lg px-7 text-sm font-bold uppercase tracking-[0.06em] opacity-50"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
