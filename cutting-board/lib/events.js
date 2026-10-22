export const EVENT_KINDS = ['event', 'drop', 'content'];
export const EVENT_ROLES = ['prep', 'rollout', 'launch', 'followup', 'support'];
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Validates an event from the Year view. A missing start date means "not scheduled yet".
export function cleanEvent(b) {
  const title = String(b?.title || '').trim();
  if (!title) return { error: 'Give it a name.' };
  const kind = EVENT_KINDS.includes(b?.kind) ? b.kind : 'event';
  const start = isDate(b?.start) ? b.start : null;
  let end = start && isDate(b?.end) ? b.end : null;
  if (end && end < start) return { error: 'The end date has to be on or after the start date.' };
  if (end === start) end = null;
  const notes = String(b?.notes || '').trim() || null;
  const pid = Number(b?.parent_id);
  const parent_id = Number.isInteger(pid) && pid > 0 ? pid : null;
  const role = parent_id && EVENT_ROLES.includes(b?.role) ? b.role : parent_id ? 'support' : null;
  return { title, kind, start, end, notes, parent_id, role };
}
