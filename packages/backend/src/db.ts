import postgres from "postgres";
import { config } from "./config.ts";

// int8 and numeric come back as numbers: ids and scores in this schema stay far below 2^53.
const numberType = (oid: number) => ({
  to: oid,
  from: [oid],
  serialize: (value: unknown) => String(value),
  parse: (value: string) => Number(value),
});

export const sql = postgres(config.databaseUrl, {
  max: Number(process.env.DATABASE_POOL_MAX || 10),
  // Keep connections through quiet minutes: a reconnect costs a SCRAM exchange on the next request.
  idle_timeout: 600,
  connect_timeout: 10,
  onnotice: () => {},
  // Prepared statements keep PostgreSQL's plan cache: planning a detail read took longer than running
  // it. Searches plan every execution instead (withCustomPlans). JIT compilation costs more than
  // these short queries ever run.
  connection: { jit: "off" },
  types: {
    int8: numberType(20),
    numeric: numberType(1700),
  },
});

export type Sql = typeof sql;
export type Tx = postgres.TransactionSql;
export type Db = Sql | Tx;

/**
 * Runs queries with plans made for their actual values. A cached generic plan cannot tell a
 * two-character search term (no usable trigram) from a longer one and would scan the whole trigram
 * index, so every search goes through here.
 */
export function withCustomPlans<T>(fn: (db: Tx) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SET LOCAL plan_cache_mode = force_custom_plan`;
    return fn(tx);
  }) as Promise<T>;
}

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}

/** First row of a query that always returns one (aggregates). */
export function one<T>(rows: readonly T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("expected one row");
  return row;
}
