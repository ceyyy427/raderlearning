import type { LbSourceStatus } from "@aihot/contracts/leaderboard";
import { LB_SOURCE_STATUS_LABELS } from "@aihot/contracts/leaderboard";

const STATUS_TONE: Record<LbSourceStatus, string> = {
  ranked: "border-accent/30 text-accent",
  cross_reference: "border-ok/30 text-ok",
  observing: "border-line-strong text-ink-4",
  reference_only: "border-amber/35 text-amber-ink",
  awaiting: "border-hot/30 text-hot",
};

export function StatusChip({ status, large = false }: { status: LbSourceStatus; large?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-mark border font-medium ${large ? "h-7 px-2.5 text-[12.5px]" : "h-[22px] px-2 text-[11px]"} ${STATUS_TONE[status]}`}>
      {LB_SOURCE_STATUS_LABELS[status]}
    </span>
  );
}
