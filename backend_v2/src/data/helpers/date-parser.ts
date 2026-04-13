/**
 * Parse Brazilian date formats (dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy).
 * Returns null if parsing fails.
 */
export function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const patterns: Array<{ regex: RegExp; order: [number, number, number] }> = [
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: [2, 1, 0] }, // dd/mm/yyyy
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, order: [0, 1, 2] }, // yyyy-mm-dd
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, order: [2, 1, 0] }, // dd-mm-yyyy
  ];

  for (const { regex, order } of patterns) {
    const match = trimmed.match(regex);
    if (match) {
      const parts = [match[1], match[2], match[3]];
      const year = parseInt(parts[order[0]], 10);
      const month = parseInt(parts[order[1]], 10);
      const day = parseInt(parts[order[2]], 10);

      if (month < 1 || month > 12 || day < 1 || day > 31) continue;

      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }
  return null;
}

/**
 * Parse datetime formats (dd/mm/yyyy HH:mm, dd/mm/yyyy HH:mm:ss, ISO).
 * Falls back to date-only (midnight).
 */
export function parseDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dtPatterns: Array<{
    regex: RegExp;
    extract: (m: RegExpMatchArray) => Date | null;
  }> = [
    {
      // dd/mm/yyyy HH:mm or dd/mm/yyyy HH:mm:ss
      regex: /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
      extract: (m) => {
        const d = new Date(
          parseInt(m[3], 10),
          parseInt(m[2], 10) - 1,
          parseInt(m[1], 10),
          parseInt(m[4], 10),
          parseInt(m[5], 10),
          m[6] ? parseInt(m[6], 10) : 0,
        );
        return isNaN(d.getTime()) ? null : d;
      },
    },
    {
      // yyyy-mm-ddTHH:mm:ss
      regex: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
      extract: (m) => {
        const d = new Date(
          parseInt(m[1], 10),
          parseInt(m[2], 10) - 1,
          parseInt(m[3], 10),
          parseInt(m[4], 10),
          parseInt(m[5], 10),
          parseInt(m[6], 10),
        );
        return isNaN(d.getTime()) ? null : d;
      },
    },
  ];

  for (const { regex, extract } of dtPatterns) {
    const match = trimmed.match(regex);
    if (match) {
      const result = extract(match);
      if (result) return result;
    }
  }

  // Fallback: date only (midnight)
  const d = parseDate(trimmed);
  return d;
}

const EMAIL_RE = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

export function validateEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
