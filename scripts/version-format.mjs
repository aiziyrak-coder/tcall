/** @param {{ major: number, patch: number }} v */
export function formatVersion(v) {
  const patchStr = String(v.patch).padStart(6, "0");
  return `${v.major}.${patchStr}`;
}

/** @param {string} s e.g. 1.000000 or 2.000000 */
export function parseVersion(s) {
  const m = String(s).trim().match(/^(\d+)\.(\d{6})$/);
  if (!m) throw new Error(`Invalid version format: ${s} (expected e.g. 1.000000)`);
  return {
    major: Number(m[1]),
    patch: Number(m[2]),
  };
}
