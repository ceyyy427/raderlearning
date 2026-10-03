/** Standard competition ranking ("1224") of scores, highest first — the rank a source's own table shows. */
export function competitionRanks(scores: number[]): number[] {
  return scores.map((s) => 1 + scores.filter((o) => o > s).length);
}
