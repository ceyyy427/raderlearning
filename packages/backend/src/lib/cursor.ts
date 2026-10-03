// Opaque cursors: prefix + base64url(JSON). Bound to the query that produced them via a hash.
import { shortHash, stableJson } from "./ids.ts";

export class InvalidCursorError extends Error {}

export function encodeCursor(prefix: string, payload: Record<string, unknown>): string {
  return `${prefix}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

export function decodeCursor<T extends Record<string, unknown>>(prefix: string, cursor: string): T {
  if (!cursor.startsWith(`${prefix}.`)) throw new InvalidCursorError("unknown cursor format");
  try {
    const json = Buffer.from(cursor.slice(prefix.length + 1), "base64url").toString("utf8");
    const value = JSON.parse(json);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value as T;
  } catch {
    throw new InvalidCursorError("malformed cursor");
  }
}

export function queryBinding(query: unknown): string {
  return shortHash(stableJson(query), 12);
}
