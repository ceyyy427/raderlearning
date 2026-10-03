// Artificial Analysis Intelligence Index (free API tier, headline index only; attribution required).
import { credential } from "../../../config.ts";
import { configurationOf, splitName } from "../configuration.ts";
import type { Fetcher, ParsedRow } from "../types.ts";

interface AaModel {
  id: string;
  name: string;
  slug: string;
  release_date: string | null;
  model_creator: { name: string } | null;
  evaluations: { artificial_analysis_intelligence_index: number | null } | null;
}

export const artificialAnalysis: Fetcher = {
  sourceKeys: ["artificial-analysis"],
  async fetch() {
    const key = credential("collectors", "ARTIFICIAL_ANALYSIS_API_KEY");
    if (!key) throw new Error("ARTIFICIAL_ANALYSIS_API_KEY is not configured");
    const models: AaModel[] = [];
    let version: number | null = null;
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`https://artificialanalysis.ai/api/v2/language/models/free?page=${page}`, {
        headers: { "x-api-key": key, accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`artificial-analysis HTTP ${res.status}`);
      const body = (await res.json()) as { data: AaModel[]; intelligence_index_version: number; pagination: { has_more: boolean } };
      version = body.intelligence_index_version;
      models.push(...body.data);
      if (!body.pagination.has_more) break;
    }
    const rows: ParsedRow[] = [];
    for (const m of models) {
      const score = m.evaluations?.artificial_analysis_intelligence_index;
      if (score === null || score === undefined) continue;
      const { base, descriptors } = splitName(m.name);
      const configuration = configurationOf(descriptors);
      // Some upstream slugs carry dots or capitals ("glm-4.5", "QwQ-32B-Preview"); stored names are lowercase-hyphenated.
      const name = m.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      rows.push({
        sourceModelName: name,
        altNames: name === m.slug ? [m.name] : [m.slug, m.name],
        baseName: base,
        organization: m.model_creator?.name ?? null,
        releasedAt: m.release_date,
        configuration,
        metricKey: "artificial-analysis:intelligence",
        metricName: "Artificial Analysis Intelligence Index",
        rawScore: score,
        metadata: { unit: "points", sourceModelId: m.id, sourceModelSlug: m.slug, evaluationField: "artificial_analysis_intelligence_index", metricDirection: "HIGHER" },
      });
    }
    return [{
      sourceKey: "artificial-analysis",
      sourceName: "Artificial Analysis Intelligence Index",
      sourceUrl: "https://artificialanalysis.ai/api/v2/language/models/free",
      license: "API 数据展示或分享须显著署名；再分发权与定制条款须另行取得并遵守 Terms of Use",
      attributionUrl: "https://artificialanalysis.ai/data-api/docs",
      publishedAt: null,
      rows,
      metadata: { apiTier: "free", apiAccess: "free-headline", intelligenceIndexVersion: version, sourceOperator: "Artificial Analysis", sourceFamily: "broad-composite", metricCount: 1 },
    }];
  },
};
