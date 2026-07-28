/**
 * Shared date formatting for the admin panel.
 *
 * The backend sends timestamps as Java `LocalDateTime` serialized with no
 * timezone suffix (e.g. "2026-07-28T15:44:31.123"), but they're always the
 * server's UTC clock. Left alone, `new Date(...)` on a zone-less string is
 * parsed as *local browser time*, which silently shows the wrong clock time
 * to anyone not in UTC. We force UTC parsing (matching what the string
 * actually represents) and then explicitly render in Asia/Colombo, so times
 * are correct regardless of the admin's own machine/browser timezone.
 */
const asUtcDate = (isoString) => {
  if (!isoString) return null;
  const hasZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(isoString);
  const d = new Date(hasZone ? isoString : `${isoString}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatColomboDate = (isoString, opts = {}) => {
  const d = asUtcDate(isoString);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric', ...opts });
};

export const formatColomboTime = (isoString, opts = {}) => {
  const d = asUtcDate(isoString);
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', ...opts });
};

export const formatColomboDateTime = (isoString, opts = {}) => {
  const d = asUtcDate(isoString);
  if (!d) return '—';
  return d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...opts });
};
