// Initial board, from the Oct 2026 post–Climate Week debrief.
// [title, compute, estimated hours?]
// compute: 'high' = 7am–3pm workstation block, 'low' = laptop block after 3pm.
export const SEED = [
  {
    name: 'Creator incubation deck', lane: 'Strategy', priority: 0, deadline: '2026-10-04',
    summary: 'Two versions: collab pitch for Sage Lenier, hire pitch for NASA JPL. Goal: incubate creators in climate, civic tech, green tech and veganism into DTC audiences that funnel to community.',
    tasks: [
      ['Pull personal-brand methodology from past Claude chats', 'low'],
      ['Ch. 1 Mindset: Ikigai, future authoring, 3×3 reference bank, capacity audit', 'low'],
      ['Ch. 2 Brand architecture: mood board, visual language, set design', 'low'],
      ['Ch. 3 Metrics: retention, shareability, Purple Cow, Trial Reels hook testing', 'low'],
      ['Ch. 4 Content pillars: signature series, filler, low-lift', 'low'],
      ['Case studies: own page (~100K), Miriam Ferreira (~80K), updated data', 'low'],
      ['Cut Sage collab version', 'low'],
      ['Cut NASA JPL version', 'low'],
    ],
  },
  {
    name: 'Wedding edit, v1', lane: 'Production', priority: 0, deadline: '2026-10-03',
    summary: '30-minute cut. Budget 10–15 hours, workstation only.',
    tasks: [
      ['Ingest, organize bins, sync audio', 'high', 1.5],
      ['Selects and string-out', 'high', 2.5],
      ['30-minute assembly', 'high', 4],
      ['Fine cut and music', 'high', 3],
      ['Color pass', 'high', 2],
      ['Sound mix', 'high', 1.5],
      ['Export v1 and send to client', 'high', 1],
    ],
  },
  {
    name: 'Hopamine network build', lane: 'Hopamine', priority: 1, deadline: '2026-10-01',
    summary: 'Back end with Singh, Vishav and Jonathan. Jaybird dashboards into the network front end; project directory for past, current and upcoming hackathons.',
    tasks: [
      ['Dev call with Singh, Vishav, Jonathan', 'high'],
      ['Scope Jaybird dashboard data into the front end', 'high'],
      ['Spec the live project directory', 'low'],
      ['Draft Hopamine SOP (Joe Justice placeholder)', 'low'],
      ['Developer onboarding white paper (request-and-accept contributions)', 'low'],
      ['Recruit a web dev from the network', 'low'],
    ],
  },
  {
    name: 'NYU hackathon rollout', lane: 'Hopamine', priority: 1, deadline: null,
    summary: 'With Seeding Sovereignty. Recap video, interview series, and opening the private Instagram backlog.',
    tasks: [
      ['Gather all hackathon footage', 'high'],
      ['Edit recap video', 'high'],
      ['Cut Hopamine interview series episodes', 'low'],
      ['Accept pending followers on the private Instagram', 'low'],
    ],
  },
  {
    name: 'Hopamine community', lane: 'Hopamine', priority: 1, deadline: null,
    summary: 'Discord upkeep and post–Climate Week follow-ups.',
    tasks: [
      ['Update the Discord manifesto', 'low'],
      ['Follow up with the Green Hackathons organizer (Cooley event)', 'low'],
    ],
  },
  {
    name: 'Revenue engine', lane: 'Business', priority: 2, deadline: null,
    summary: 'Faceless UGC for sustainable brands through the sole proprietorship. Target: $10K+ per project, 1–2 per month.',
    tasks: [
      ['Send out Post-it campaign pitch decks', 'low'],
      ['Build faceless UGC portfolio', 'low'],
      ['Build Canva pitch template', 'low'],
      ['Build a list of sustainable DTC brands to pitch', 'low'],
    ],
  },
  {
    name: 'Legal and IP', lane: 'Business', priority: 3, deadline: null,
    summary: 'Nonprofit or NGO registration in the US and Canada, and international protection for the Hopamine name.',
    tasks: [
      ['Finish the book, take notes on US registration', 'low'],
      ['Compare US vs Canada nonprofit registration paths', 'low'],
      ['Price international trademark filing for Hopamine', 'low'],
    ],
  },
];

// Hour estimates backfilled into boards created before estimates existed.
export const EST_BACKFILL = {
  'Ingest, organize bins, sync audio': 1.5, 'Selects and string-out': 2.5, '30-minute assembly': 4,
  'Fine cut and music': 3, 'Color pass': 2, 'Sound mix': 1.5, 'Export v1 and send to client': 1,
};
