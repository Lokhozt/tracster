export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = fields
    .filter((field): field is string => Boolean(field))
    .join(" ")
    .toLowerCase();

  return normalized.split(/\s+/).every((term) => haystack.includes(term));
}

export function isPastDate(isoDate: string): boolean {
  return new Date(isoDate) < new Date();
}
