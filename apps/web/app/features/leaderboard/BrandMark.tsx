import type { LbBrand } from "@aihot/contracts/leaderboard";

// Marks drawn in white for a dark tile (Kimi's K) sit on their own dark plate.
const DARK_TILE = new Set(["/model-providers/moonshot.svg"]);

/** Vendor or evaluator mark on a bordered tile; falls back to a monogram. Marks identify, never endorse. */
export function BrandMark({ brand, size = 28, className = "" }: { brand: LbBrand | null; size?: number; className?: string }) {
  const radius = Math.round(size * 0.27);
  if (brand?.src) {
    const dark = DARK_TILE.has(brand.src);
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden border ${dark ? "border-transparent bg-[#111]" : `border-line bg-white ${brand.raster ? "" : "dark:bg-white/95"}`} ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
        aria-hidden="true"
      >
        <img src={brand.src} alt="" width={size} height={size} loading="lazy" decoding="async" className={`object-contain ${dark ? "h-[66%] w-[66%]" : "h-[64%] w-[64%]"}`} />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-line bg-accent-soft font-semibold text-accent ${className}`}
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {brand?.monogram ?? "?"}
    </span>
  );
}
