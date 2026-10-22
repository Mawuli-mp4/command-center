// Campaigns are one level deep: a main item and the items linked to it.
// Linking to an item that is itself linked attaches to its main item instead.
// An item that already has linked items can't be linked under another.
export async function resolveParent(sql, parentId, selfId) {
  if (!parentId || parentId === selfId) return null;
  if (selfId) {
    const [kids] = await sql`SELECT count(*)::int AS n FROM events WHERE parent_id = ${selfId}`;
    if (kids.n > 0) return null;
  }
  const [p] = await sql`SELECT id, parent_id FROM events WHERE id = ${parentId}`;
  if (!p) return null;
  const top = p.parent_id || p.id;
  return top === selfId ? null : top;
}
