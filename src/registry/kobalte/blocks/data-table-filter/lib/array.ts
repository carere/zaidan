export function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter((x) => b.includes(x));
}

function deepHash(value: any, cache = new WeakMap<object, string>()): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "number" || type === "boolean" || type === "string") {
    return `${type}:${value.toString()}`;
  }
  if (type === "function") {
    return `function:${value.toString()}`;
  }

  if (type === "object") {
    if (cache.has(value)) {
      return cache.get(value)!;
    }
    let hash: string;
    if (Array.isArray(value)) {
      hash = `array:[${value.map((v) => deepHash(v, cache)).join(",")}]`;
    } else {
      const keys = Object.keys(value).sort();
      const props = keys.map((k) => `${k}:${deepHash(value[k], cache)}`).join(",");
      hash = `object:{${props}}`;
    }
    cache.set(value, hash);
    return hash;
  }

  return `${type}:${value.toString()}`;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || a === undefined || b === undefined) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    if (typeof b !== "object") return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      if (aKeys[i] !== bKeys[i]) return false;
      if (!deepEqual(a[aKeys[i]], b[bKeys[i]])) return false;
    }
    return true;
  }

  return false;
}

export function uniq<T>(arr: T[]): T[] {
  const seen = new Map<string, T[]>();
  const result: T[] = [];

  for (const item of arr) {
    const hash = deepHash(item);
    if (seen.has(hash)) {
      const itemsWithHash = seen.get(hash)!;
      let duplicateFound = false;
      for (const existing of itemsWithHash) {
        if (deepEqual(existing, item)) {
          duplicateFound = true;
          break;
        }
      }
      if (!duplicateFound) {
        itemsWithHash.push(item);
        result.push(item);
      }
    } else {
      seen.set(hash, [item]);
      result.push(item);
    }
  }

  return result;
}

export function take<T>(a: T[], n: number): T[] {
  return a.slice(0, n);
}

export function flatten<T>(a: T[][]): T[] {
  return a.flat();
}

export function addUniq<T>(arr: T[], values: T[]): T[] {
  return uniq([...arr, ...values]);
}

export function removeUniq<T>(arr: T[], values: T[]): T[] {
  return arr.filter((v) => !values.includes(v));
}

export function isAnyOf<T>(value: T, values: T[]): boolean {
  return values.includes(value);
}
