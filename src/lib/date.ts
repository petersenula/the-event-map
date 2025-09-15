export function isDateInRange(
  event: { start_date?: string; end_date?: string },
  range?: { startDate: Date; endDate: Date }
): boolean {
  if (!range || !range.startDate || !range.endDate) return false;
  if (!event.start_date || !event.end_date) return false;

  const start = new Date(event.start_date);
  const end = new Date(event.end_date);

  return start <= range.endDate && end >= range.startDate;
}
