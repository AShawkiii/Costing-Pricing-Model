/** Stable, collision-free ids for rows. Kept tiny and dependency-free. */
let counter = 0;

export function createId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
