// [C01-F01] Name sanitization: lowercase, spaces→hyphens, strip non-alphanumeric except hyphens
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// [C05-F01] djb2 hash for essay filename slugs
export function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(36).slice(0, 6).padStart(6, '0');
}

// [C05-F01] essay type → slug prefix
export const ESSAY_TYPE_SLUGS: Record<string, string> = {
  'Personal Statement': 'personal-statement',
  'Why <University>?': 'why-university',
  'Supplemental — Activity/Accomplishment': 'supplemental-activity',
  'Supplemental — Community/Identity': 'supplemental-community',
  'Supplemental — Other': 'supplemental-other',
};
