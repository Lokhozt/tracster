/** Most recent 1 September on or before `now` (local calendar). */
export function defaultAssociationStatsPeriodStart(now: Date = new Date()): Date {
  const year = now.getFullYear();
  const thisSeptember = new Date(year, 8, 1, 0, 0, 0, 0);
  if (now >= thisSeptember) {
    return thisSeptember;
  }
  return new Date(year - 1, 8, 1, 0, 0, 0, 0);
}

/** 1 September after `start` (exclusive end of the default season window). */
export function defaultAssociationStatsPeriodEnd(
  start: Date = defaultAssociationStatsPeriodStart(),
): Date {
  return new Date(start.getFullYear() + 1, 8, 1, 0, 0, 0, 0);
}

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
