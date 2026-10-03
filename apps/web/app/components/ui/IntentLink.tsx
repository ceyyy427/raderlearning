import { useEffect, useRef, useState } from "react";
import { Link, type LinkProps } from "react-router";

/** Hover, keyboard focus and a stationary touch prefetch; scrolling over a card does not. */
export function IntentLink({ onFocus, onBlur, onMouseEnter, onMouseLeave, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, ...props }: Omit<LinkProps, "prefetch">) {
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const start = () => {
    clear();
    timer.current = setTimeout(() => { timer.current = null; setReady(true); }, 100);
  };
  const cancel = () => { clear(); setReady(false); };
  useEffect(() => { cancel(); return clear; }, [props.to]);
  return <Link {...props} prefetch={ready ? "render" : "none"}
    onFocus={(e) => { onFocus?.(e); if (!e.defaultPrevented) start(); }}
    onBlur={(e) => { onBlur?.(e); cancel(); }}
    onMouseEnter={(e) => { onMouseEnter?.(e); if (!e.defaultPrevented) start(); }}
    onMouseLeave={(e) => { onMouseLeave?.(e); cancel(); }}
    onTouchStart={(e) => { onTouchStart?.(e); if (!e.defaultPrevented) start(); }}
    onTouchMove={(e) => { onTouchMove?.(e); cancel(); }}
    onTouchEnd={(e) => { onTouchEnd?.(e); cancel(); }}
    onTouchCancel={(e) => { onTouchCancel?.(e); cancel(); }}
  />;
}
