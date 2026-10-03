// A tiny toast stack for admin command results (no dependency, one instance in the admin layout).
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type Tone = "ok" | "error" | "info";
interface Item {
  id: number;
  text: string;
  tone: Tone;
}

let listeners: Array<(items: Item[]) => void> = [];
let items: Item[] = [];
let seq = 0;

function emit() {
  for (const l of listeners) l(items);
}

export function toast(text: string, tone: Tone = "info") {
  const id = ++seq;
  items = [...items, { id, text, tone }].slice(-4);
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, tone === "error" ? 6500 : 3200);
}

export function Toaster() {
  const [list, setList] = useState<Item[]>([]);
  useEffect(() => {
    listeners.push(setList);
    return () => {
      listeners = listeners.filter((l) => l !== setList);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className={`pointer-events-auto max-w-md rounded-card px-4 py-2.5 text-[13.5px] shadow-lg ring-1 backdrop-blur ${
              t.tone === "error" ? "bg-hot text-white ring-hot/40" : t.tone === "ok" ? "bg-ink text-bg ring-line-strong" : "bg-surface text-ink ring-line-strong"
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
