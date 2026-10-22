// One-time data imports, each guarded by a settings flag so it runs once per database.

// From the Adam × Hopamine call, Oct 22 2026: a Board project with its action items,
// plus Year-map entries linked into campaigns.
export async function importAdamCall(sql) {
  const [proj] = await sql`INSERT INTO projects (name, lane, priority, deadline, summary, sort)
    VALUES ('Hopamine media launch', 'Hopamine', 1, '2026-11-22',
      'From the Adam × Hopamine call: brand deck, interview series, identity video, and the Instagram going public.',
      (SELECT coalesce(max(sort), 0) + 1 FROM projects)) RETURNING id`;
  const tasks = [
    ["Settle Adam's role and title", 'low'],
    ['Visual language guide and brand deck', 'low'],
    ['Send the deck to Calvin for input', 'low'],
    ['Write the interview question set and interviewee prep note', 'low'],
    ['Pick the ~10 usable interviews (co-op + hackathon)', 'high'],
    ['Hackathon rollout: pull the archive, build a stylized footage bank', 'high'],
    ['Identity video: lock concept and shoot plan', 'low'],
    ['Draft the weekly recap format (upcycled content)', 'low'],
    ['Set the Instagram go-public date after the network dev meeting', 'low'],
    ['Reach out to Sharat at Mob Journal', 'low'],
  ];
  for (const [i, [title, compute]] of tasks.entries()) {
    await sql`INSERT INTO tasks (project_id, title, compute, sort) VALUES (${proj.id}, ${title}, ${compute}, ${i})`;
  }

  const find = async (title) => (await sql`SELECT id FROM events WHERE title = ${title} ORDER BY id LIMIT 1`)[0]?.id ?? null;
  const add = async (e) => (await sql`INSERT INTO events (title, kind, start_date, end_date, notes, parent_id, role)
    VALUES (${e.title}, ${e.kind}, ${e.start || null}, ${e.end || null}, ${e.notes || null}, ${e.parent || null}, ${e.role || null})
    RETURNING id`)[0].id;

  const ig = await add({ title: 'Hopamine Instagram goes public', kind: 'drop', start: '2026-11-22',
    notes: 'Target from the Adam call. Final date set after the network dev meeting.' });
  await add({ title: 'Visual language guide and brand deck', kind: 'content', parent: ig, role: 'prep' });
  await add({ title: 'Hackathon footage bank from the archive', kind: 'content', parent: ig, role: 'prep' });
  await add({ title: 'Hopamine identity video (first post)', kind: 'content', parent: ig, role: 'launch' });
  await add({ title: 'Interview series: first cuts', kind: 'content', parent: ig, role: 'launch',
    notes: 'About 10 usable interviews from the co-op and the NYU hackathon.' });
  await add({ title: 'Hackathon announcement + Discord call to action', kind: 'content', parent: ig, role: 'rollout' });
  const hackPosts = await find('Hackathon posts (3–5)');
  if (hackPosts) await sql`UPDATE events SET parent_id = ${ig}, role = 'rollout' WHERE id = ${hackPosts}`;

  const residency = await find('Apathy is Boring residency: media literacy seminar');
  const resPosts = await find('Residency posts (3 paid reels)');
  if (residency && resPosts) await sql`UPDATE events SET parent_id = ${residency}, role = 'followup' WHERE id = ${resPosts}`;

  const hey = await find('Hey change drop');
  if (hey) {
    await sql`UPDATE events SET notes = coalesce(notes, 'Hey Change podcast episode.') WHERE id = ${hey}`;
    await add({ title: 'Hey Change podcast clips', kind: 'content', parent: hey, role: 'followup' });
  }

  await add({ title: 'Veganuary segment', kind: 'content', start: '2027-01-01', end: '2027-01-31',
    notes: 'Vegan facts, plant-based businesses and plant-based fashion.' });
}
