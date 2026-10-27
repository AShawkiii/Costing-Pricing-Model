/**
 * Small non-cryptographic hash (FNV-1a).
 *
 * Used to tell whether the workspace has changed since it was last saved,
 * without keeping a second copy of the whole model in storage.
 */

export function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Hash of any JSON-serialisable value. */
export function hashValue(value: unknown): string {
  return hashString(JSON.stringify(value));
}
