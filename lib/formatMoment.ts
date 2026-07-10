// The moment is local wall-clock time ("9:42 PM in Jeju") — parsed with a regex,
// never via `new Date(string)`, so no timezone/DST math can shift it.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMoment(takenAt: string | null | undefined): string | null {
  if (!takenAt) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(takenAt);
  if (!m) return null;
  const year = m[1];
  const monthIdx = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const hour24 = parseInt(m[4], 10);
  const minute = m[5];
  if (monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31 || hour24 > 23 || parseInt(minute, 10) > 59) {
    return null;
  }
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${MONTHS[monthIdx]} ${day}, ${year} · ${hour12}:${minute} ${period}`;
}

/** Format a Date's local fields for a `<input type="datetime-local">` value. */
export function toDateTimeLocalValue(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
