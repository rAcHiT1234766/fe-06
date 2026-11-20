/**
 * Lower-case letters and digits of `text`, accents dropped, words joined by dashes, as file names
 * and dashboard ids use them; `fallback` when nothing is left.
 */
export function slugify(text: string, fallback: string): string {
  const words = text
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.join('-') || fallback;
}

/** `base`, or `base-2`, `base-3` and so on, whichever is not taken yet. */
export function unusedId(base: string, taken: readonly string[]): string {
  let id = base;
  for (let count = 2; taken.includes(id); count++) id = `${base}-${count}`;
  return id;
}
