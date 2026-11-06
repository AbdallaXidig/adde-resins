type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function deepMerge(base: Obj, extra: Obj): Obj {
  const out: Obj = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k] as Obj, v) : v;
  }
  return out;
}

export function setByPath(target: Obj, dotted: string, value: unknown): void {
  const parts = dotted.split(".");
  // Keys come from an admin allow-list, but prototype paths are refused regardless.
  if (parts.some((p) => p === "__proto__" || p === "constructor" || p === "prototype")) return;
  let cur: Obj = target;
  for (const p of parts.slice(0, -1)) {
    if (!isObj(cur[p])) cur[p] = {};
    cur = cur[p] as Obj;
  }
  cur[parts[parts.length - 1]] = value;
}
