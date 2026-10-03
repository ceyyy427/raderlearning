// Fixed renditions use the existing signed mode parameter. They share a caching proxy's existing
// URL+mode cache identity; no Accept negotiation or additional cache-key parameters are needed.
export const IMAGE_WIDTHS = {
  avatar: 96, card: 336, thumb: 720, full: 1600, og: 1200,
  "avatar-48": 48, "avatar-96": 96,
  "image-336": 336, "image-720": 720, "image-1200": 1200, "image-1600": 1600,
} as const;

export type ProxyMode = keyof typeof IMAGE_WIDTHS;
export type ResponsiveImageKind = "avatar" | "card" | "body" | "hero";

export const RESPONSIVE_MODES = {
  avatar: ["avatar-48", "avatar-96"],
  card: ["image-336", "image-720"],
  body: ["image-720", "image-1200", "image-1600"],
  hero: ["image-720", "image-1200", "image-1600"],
} as const satisfies Record<ResponsiveImageKind, readonly ProxyMode[]>;
