// All upstream fetchers, in the order a refresh runs them.
import { arena } from "./sources/arena.ts";
import { artificialAnalysis } from "./sources/artificial-analysis.ts";
import { deepswe } from "./sources/deepswe.ts";
import { epoch } from "./sources/epoch.ts";
import { eqbench } from "./sources/eqbench.ts";
import { livebench } from "./sources/livebench.ts";
import { mercor } from "./sources/mercor.ts";
import { taptap } from "./sources/taptap.ts";
import { terminalBench } from "./sources/terminal-bench.ts";
import { vals } from "./sources/vals.ts";
import type { Fetcher } from "./types.ts";

export const FETCHERS: Fetcher[] = [artificialAnalysis, arena, livebench, eqbench, epoch, deepswe, taptap, mercor, vals, terminalBench];
