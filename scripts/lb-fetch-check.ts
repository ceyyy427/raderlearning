// Runs leaderboard fetchers without writing and compares every row with the latest stored snapshot of
// each source, keyed by configuration: same model, same score, same representative choice; then the
// details the public pages show (label, interval, sample size, source rank). Differences are either
// upstream changes since that snapshot or parser differences.
//   node --env-file=.env scripts/lb-fetch-check.ts [source-key ...]
import { closeDb, sql } from "@aihot/backend/db";
import { FETCHERS } from "@aihot/backend/leaderboard/fetch/index";
import { resolveRows, storedConfigurationKey } from "@aihot/backend/leaderboard/fetch/store";

interface StoredRow {
  model_id: string;
  slug: string;
  metric_key: string;
  metric_name: string;
  raw_score: number;
  configuration_key: string;
  configuration_label: string;
  selected_for_product: boolean;
  lower_bound: number | null;
  upper_bound: number | null;
  sample_size: number | null;
  source_rank: number | null;
}

const SHOW = Number(process.env.SHOW ?? 12);
const near = (a: number | null | undefined, b: number | null) => (a == null ? b == null : b != null && Math.abs(a - b) < 1e-6);
const wanted = new Set(process.argv.slice(2));

for (const f of FETCHERS) {
  if (wanted.size && !f.sourceKeys.some((k) => wanted.has(k))) continue;
  let results;
  try {
    results = await f.fetch();
  } catch (e) {
    console.log(`${f.sourceKeys.join(",")}: FETCH FAILED ${(e as Error).message}`);
    continue;
  }
  for (const r of results) {
    if (wanted.size && !wanted.has(r.sourceKey)) continue;
    const { rows, newModels } = await resolveRows(r, true);
    const [snap] = await sql<{ id: string; source_name: string; source_url: string; license: string; attribution_url: string; published_at: Date | null }[]>`
      SELECT id, source_name, source_url, license, attribution_url, published_at FROM lb_snapshots WHERE source_key = ${r.sourceKey} ORDER BY fetched_at DESC LIMIT 1`;
    if (!snap) {
      console.log(`${r.sourceKey}: no stored snapshot · ours ${rows.length} rows`);
      continue;
    }
    const stored = await sql<StoredRow[]>`
      SELECT c.model_id, m.slug, c.metric_key, c.metric_name, c.raw_score, c.configuration_key, c.configuration_label, c.selected_for_product,
             c.lower_bound, c.upper_bound, c.sample_size, c.source_rank
      FROM lb_scores c JOIN lb_models m ON m.id = c.model_id WHERE c.snapshot_id = ${snap.id}`;
    const ours = new Map(rows.map((x) => [`${storedConfigurationKey(x)}|${x.metricKey}`, x]));
    let same = 0;
    let selectedSame = 0;
    const diffs: string[] = [];
    const shown: string[] = [];
    for (const s of stored) {
      const o = ours.get(`${s.configuration_key}|${s.metric_key}`);
      if (!o) {
        diffs.push(`missing ${s.configuration_key} (${s.slug} = ${s.raw_score})`);
        continue;
      }
      const problems = [
        o.modelId !== s.model_id && `model → ${o.modelId}`,
        Math.abs(o.rawScore - s.raw_score) >= 1e-9 && `score ${s.raw_score} → ${o.rawScore}`,
        o.selected !== s.selected_for_product && `selected ${s.selected_for_product} → ${o.selected}`,
      ].filter(Boolean);
      if (problems.length) diffs.push(`${s.configuration_key} (${s.slug}): ${problems.join("; ")}`);
      else {
        same += 1;
        if (s.selected_for_product) selectedSame += 1;
      }
      const detail = [
        o.configuration.label !== s.configuration_label && `label ${s.configuration_label} → ${o.configuration.label}`,
        o.metricName !== s.metric_name && `metric ${s.metric_name} → ${o.metricName}`,
        !(near(o.lowerBound, s.lower_bound) && near(o.upperBound, s.upper_bound)) && `bounds ${s.lower_bound}–${s.upper_bound} → ${o.lowerBound}–${o.upperBound}`,
        (o.sampleSize ?? null) !== s.sample_size && `n ${s.sample_size} → ${o.sampleSize}`,
        (o.sourceRank ?? null) !== s.source_rank && `rank ${s.source_rank} → ${o.sourceRank}`,
      ].filter(Boolean);
      if (detail.length) shown.push(`${s.slug}: ${detail.join("; ")}`);
    }
    const storedKeys = new Set(stored.map((s) => `${s.configuration_key}|${s.metric_key}`));
    for (const [k, o] of ours) if (!storedKeys.has(k)) diffs.push(`extra ${storedConfigurationKey(o)} (${o.sourceModelName} = ${o.rawScore}${o.selected ? ", selected" : ""})`);
    const snapDiff = [
      snap.source_name !== r.sourceName && `name ${snap.source_name} → ${r.sourceName}`,
      snap.source_url !== r.sourceUrl && `url ${snap.source_url} → ${r.sourceUrl}`,
      snap.license !== r.license && `license ${snap.license} → ${r.license}`,
      snap.attribution_url !== r.attributionUrl && `attribution ${snap.attribution_url} → ${r.attributionUrl}`,
      (snap.published_at?.toISOString() ?? null) !== (r.publishedAt ? new Date(r.publishedAt).toISOString() : null) && `published ${snap.published_at?.toISOString()} → ${r.publishedAt}`,
    ].filter(Boolean);

    const storedSelected = stored.filter((s) => s.selected_for_product).length;
    console.log(`${r.sourceKey}: rows ${same}/${stored.length} identical (representative ${selectedSame}/${storedSelected}) · ours ${rows.length} · new models ${newModels.length}`);
    for (const d of diffs.slice(0, SHOW)) console.log(`  ${d}`);
    if (diffs.length > SHOW) console.log(`  … ${diffs.length} differences`);
    if (snapDiff.length) console.log(`  snapshot differs: ${snapDiff.join("; ")}`);
    if (shown.length) console.log(`  displayed details differ on ${shown.length}: ${shown.slice(0, 4).join(" | ")}`);
  }
}
await closeDb();
