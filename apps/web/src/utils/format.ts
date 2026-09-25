const locale = 'pt-PT';

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (iso: string) => `${formatDay(iso)} · ${formatTime(iso)}`;

export const formatMoney = (value: number) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);

export const isSameDay = (a: string | Date, b: string | Date) =>
  new Date(a).toDateString() === new Date(b).toDateString();

/** Dias úteis (seg–sex) entre hoje (exclusive) e a data indicada (inclusive). */
export function businessDaysUntil(iso: string, from = new Date()) {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  let count = 0;
  while (cursor < target) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
