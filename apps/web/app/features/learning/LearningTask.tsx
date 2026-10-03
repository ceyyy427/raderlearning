import { useState } from "react";
import { buttonClass } from "../../components/ui/Controls";
import { recordTaskResult, getTaskResults } from "../workspace/workspace-store";

type Task = { taskType: string; question: string; solution: string; expectedConcept: string; difficulty: string; starterCode: string | null };

export function LearningTask({ eventId, task }: { eventId: string; task: Task }) {
  const previous = getTaskResults().find((result) => result.eventId === eventId);
  const [completed, setCompleted] = useState(Boolean(previous?.completed));
  const [misconception, setMisconception] = useState(previous?.misconceptionCode ?? "");
  const finish = (correct: boolean) => {
    recordTaskResult(eventId, { completed: true, correct, misconceptionCode: correct ? null : misconception.trim() || null, resultAt: new Date().toISOString() });
    setCompleted(true);
  };
  return <section aria-labelledby="learning-task" className="rounded-2xl border border-line-soft bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="learning-task" className="text-[18px] font-semibold text-ink">Learning task</h2><span className="rounded-full bg-bg-muted px-2 py-1 text-[11px] uppercase tracking-wide text-ink-4">{task.taskType} · {task.difficulty}</span></div><p className="mt-4 text-[15px] leading-relaxed text-ink">{task.question}</p><p className="mt-3 text-[13px] text-ink-3">Concept: {task.expectedConcept}</p><details className="mt-4 rounded-lg bg-bg-muted px-3 py-2 text-[13px] text-ink-2"><summary className="cursor-pointer font-medium">Reveal a source-grounded answer</summary><p className="mt-2 leading-relaxed">{task.solution}</p></details>{task.starterCode && <pre className="mt-4 overflow-x-auto rounded-lg bg-bg-sunk p-3 text-[12px]">{task.starterCode}</pre>}<div className="mt-5 border-t border-line-soft pt-4"><p className="text-[13px] font-medium text-ink">完成这道安全练习</p>{completed ? <p role="status" className="mt-2 text-[13px] text-ok-ink">已记录结果；复习卡会在稍后出现。</p> : <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={buttonClass("primary")} onClick={() => finish(true)}>我答对了</button><button type="button" className={buttonClass("secondary")} onClick={() => finish(false)}>我需要复习</button></div>}{!completed && <label className="mt-3 block text-[12px] text-ink-3">错误概念代码（可选）<input value={misconception} onChange={(event) => setMisconception(event.target.value)} maxLength={160} className="mt-1 block h-9 w-full rounded-control border border-line-strong bg-field px-3 text-[13px] text-ink outline-none focus:border-accent" placeholder="例如：version-boundary" /></label>}</div></section>;
}
