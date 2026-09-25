/*
 * FICTIONAL SAMPLE CONTENT
 * ------------------------
 * Noor Halvorsen is an invented person. Nothing here describes a real user.
 * In production this object would be assembled from the owner's existing
 * EverAtlas profile plus the few extra answers the owner gives in the studio
 * (what to include, rough time estimates, confirmed connections).
 * Real user data must never be mixed into this file.
 */
window.EA = window.EA || {};

/* Owner estimates are ranges, never exact numbers. `mid` is a geometric-ish
 * midpoint used only to size land; visitors always see the range label. */
EA.BUCKETS = {
  soFar: [
    { id: 'lt100',   label: 'under 100 hours',      short: '< 100 h',       mid: 50 },
    { id: '100-500', label: '100–500 hours',        short: '100–500 h',     mid: 250 },
    { id: '500-2k',  label: '500–2,000 hours',      short: '500–2k h',      mid: 1000 },
    { id: '2k-5k',   label: '2,000–5,000 hours',    short: '2k–5k h',       mid: 3200 },
    { id: '5k-10k',  label: '5,000–10,000 hours',   short: '5k–10k h',      mid: 7000 },
    { id: '10k-20k', label: '10,000–20,000 hours',  short: '10k–20k h',     mid: 14000 },
    { id: '20k+',    label: 'more than 20,000 hours', short: '20k+ h',      mid: 26000 }
  ],
  now: [
    { id: 'none',  label: 'not at the moment',      short: 'resting',       mid: 0 },
    { id: 'lt1',   label: 'under 1 hour a week',    short: '< 1 h/wk',      mid: 0.5 },
    { id: '1-3',   label: '1–3 hours a week',       short: '1–3 h/wk',      mid: 2 },
    { id: '3-6',   label: '3–6 hours a week',       short: '3–6 h/wk',      mid: 4.5 },
    { id: '6-12',  label: '6–12 hours a week',      short: '6–12 h/wk',     mid: 9 },
    { id: '12-25', label: '12–25 hours a week',     short: '12–25 h/wk',    mid: 18 },
    { id: '25-40', label: '25–40 hours a week',     short: '25–40 h/wk',    mid: 32 },
    { id: '40+',   label: 'more than 40 hours a week', short: '40+ h/wk',   mid: 45 }
  ]
};

/* Glyph shape is the primary encoding for kind, so meaning never relies on colour. */
EA.KINDS = {
  role:        { label: 'Role',        shape: 'square' },
  project:     { label: 'Project',     shape: 'diamond' },
  skill:       { label: 'Skill',       shape: 'triangle' },
  creation:    { label: 'Creation',    shape: 'dot' },
  study:       { label: 'Learning',    shape: 'ring' },
  community:   { label: 'Community',   shape: 'hex' },
  practice:    { label: 'Practice',    shape: 'plus' },
  milestone:   { label: 'Milestone',   shape: 'star' },
  achievement: { label: 'Recognition', shape: 'flag' }
};

/* Plain-language relationship vocabulary, read from either end. */
EA.RELATIONS = {
  inspired:          { out: 'Inspired',               back: 'Inspired by' },
  developed:         { out: 'Developed this skill',   back: 'Developed through' },
  led_to:            { out: 'Led to',                 back: 'Came from' },
  changed_direction: { out: 'Changed direction toward', back: 'A turn that began with' },
  fed_into:          { out: 'Fed into',               back: 'Draws on' },
  shaped:            { out: 'Shaped',                 back: 'Shaped by' }
};

EA.SAMPLE = {
  fictional: true,
  person: {
    name: 'Noor Halvorsen',
    pronouns: 'she/her',
    title: 'Lead product designer, Civic Works Lisbon',
    place: 'Lisbon, Portugal',
    beyond: 'A designer who plays cello, co-runs a neighbourhood garden, teaches kids to code on Saturdays and has just become a beekeeper. She learns best by making things with other people.',
    now: 'Making public services plainer to use, finishing a second EP, and keeping Saturdays for the code club.',
    season: {
      label: 'Autumn 2026',
      text: 'I spend fewer hours at a desk than I did five years ago, and more with my hands in soil, clay and hives. Work still takes most of my week. I want it to be work I’d be glad to explain to my kid.'
    }
  },

  territories: [
    { id: 'work', name: 'Design work', include: true, since: '2010',
      soFar: '20k+', now: '25-40',
      blurb: 'Sixteen years designing products and public services, mostly for people who don’t choose to use them: patients, commuters, benefit claimants.' },
    { id: 'learning', name: 'Learning', include: true, since: '1993',
      soFar: '10k-20k', now: '1-3',
      blurb: 'Architecture school, a design certificate, and slowly learning Portuguese. Mostly self-directed now.' },
    { id: 'music', name: 'Music', include: true, since: '1996',
      soFar: '5k-10k', now: '3-6',
      blurb: 'Cello since age nine. Lately: field recordings, a small band, and releases I make at the kitchen table.' },
    { id: 'people', name: 'Family & friends', include: true, since: null,
      soFar: null, now: null,
      estimateNote: 'Noor chose not to put a number on this.',
      blurb: 'A partner, a toddler, a sister in Bergen and a Sunday-dinner table that keeps growing.' },
    { id: 'running', name: 'Running', include: true, since: '2019',
      soFar: '2k-5k', now: '1-3',
      blurb: 'Early-morning runs along the river. Where a lot of thinking happens.' },
    { id: 'community', name: 'Community', include: true, since: '2020',
      soFar: '500-2k', now: '3-6',
      blurb: 'The Rua Verde garden and Saturday Code Club: two places where the neighbourhood meets.' },
    { id: 'making', name: 'Letters & clay', include: true, since: '2021',
      soFar: '500-2k', now: '1-3',
      blurb: 'Drawing a typeface and throwing pots. Slow crafts that forgive mistakes.' },
    { id: 'theatre', name: 'Theatre', include: true, since: '2001',
      soFar: '500-2k', now: 'none',
      blurb: 'Youth theatre in Bergen, then years building sets for an amateur company. Resting for now.' },
    { id: 'bees', name: 'Beekeeping', include: true, since: '2026',
      soFar: 'lt100', now: '1-3',
      blurb: 'The newest part of Noor’s life: two hives on the garden roof since May.' }
  ],

  experiences: [
    /* Design work */
    { id: 'w1', t: 'work', kind: 'role', title: 'Junior designer, Fjordlab', start: '2010', end: '2013', include: true, publishedAt: '2026-01-10',
      desc: 'First job out of architecture school, at a small Oslo studio. Wayfinding, exhibition graphics, and learning that most of design is listening.',
      skills: ['Wayfinding', 'Print production'] },
    { id: 'w2', t: 'work', kind: 'role', title: 'Product designer, Kelp Health', start: '2013', end: '2018', include: true, publishedAt: '2026-01-10',
      desc: 'Designed a medication and appointments app used by clinics across Norway. Moved from screens to services.',
      skills: ['Service design', 'Research with patients'] },
    { id: 'w3', t: 'work', kind: 'project', title: 'Medication reminders for older adults', start: '2016', end: '2017', include: true, publishedAt: '2026-01-10',
      desc: 'Co-designed a reminder system with 40 people over 75. The pilot halved missed doses, and the testers rewrote half the copy.',
      media: [{ type: 'art', caption: 'Workshop wall, week three' }, { type: 'link', label: 'Case study (sample link)' }] },
    { id: 'w4', t: 'work', kind: 'role', title: 'Lead designer, Civic Works Lisbon', start: '2020', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Leads a team of five designing public services with the city. Mentors juniors and argues for plain language in every meeting.',
      skills: ['Team leadership', 'Public-sector design'] },
    { id: 'w5', t: 'work', kind: 'project', title: 'Wayfinding for the Tidewater Line', start: '2022', end: '2023', include: true, publishedAt: '2026-01-10',
      desc: 'Signs, sound cues and a paper map for a new tram line. Each stop has its own short sound, built from recordings of that street.',
      media: [{ type: 'art', caption: 'Stop sound map' }, { type: 'audio', label: 'Stop cue: Cais do Sodré (sample)' }] },
    { id: 'w9', t: 'work', kind: 'achievement', title: 'Inclusive Design Award, Lisbon', start: '2023', end: '2023', include: true, publishedAt: '2026-01-10',
      desc: 'Given to the Tidewater Line team. Noor accepted it with the three blind riders who tested every stop.' },
    { id: 'w6', t: 'work', kind: 'project', title: 'Plain-language benefits service', start: '2024', end: null, include: true, publishedAt: '2026-03-02',
      desc: 'Rewriting how residents apply for housing support, from a 14-page form to a guided conversation.' },
    { id: 'w7', t: 'work', kind: 'skill', title: 'Designing with people, not for them', start: '2016', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Co-design: running sessions where the people affected make the key decisions.' },
    { id: 'w8', t: 'work', kind: 'skill', title: 'Explaining complex systems simply', start: '2021', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Turning policy, code or tram timetables into something a tired person can follow.' },

    /* Learning */
    { id: 'l1', t: 'learning', kind: 'study', title: 'BA Architecture, Oslo School of Architecture', start: '2006', end: '2010', include: true, publishedAt: '2026-01-10',
      desc: 'Four years of models, crits and night buses. Left wanting to design the experience of a building more than the building.' },
    { id: 'l4', t: 'learning', kind: 'study', title: 'Inclusive design certificate', start: '2018', end: '2018', include: true, publishedAt: '2026-01-10',
      desc: 'Part-time course on accessibility, disability-led research and plain language.' },
    { id: 'l2', t: 'learning', kind: 'study', title: 'Letterpress weekend, Porto', start: '2021', end: '2021', include: true, publishedAt: '2026-01-10',
      desc: 'Two days setting metal type by hand. Came home with inky fingers and a question about why letters look the way they do.' },
    { id: 'l3', t: 'learning', kind: 'practice', title: 'Learning Portuguese', start: '2019', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'From zero at 32. Now confident enough to argue about compost in it.' },
    { id: 'l5', t: 'learning', kind: 'community', title: 'Reading group: cities & care', start: '2022', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Six friends, one book a month, about how cities look after people or don’t.' },

    /* Music */
    { id: 'm1', t: 'music', kind: 'practice', title: 'Cello', start: '1996', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Started at nine in Bergen. Still practises most mornings, badly and happily.' },
    { id: 'm3', t: 'music', kind: 'community', title: 'Salt Choir (band)', start: '2020', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'A four-piece that formed around the garden’s summer parties: cello, accordion, voice and a borrowed drum machine.' },
    { id: 'm2', t: 'music', kind: 'practice', title: 'Field-recording walks', start: '2019', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Walking the city with a small recorder. Trams, gulls, market calls. The raw material for most of her music now.' },
    { id: 'm4', t: 'music', kind: 'creation', title: 'Long Rivers (EP)', start: '2021', end: '2021', include: true, publishedAt: '2026-01-10',
      desc: 'Five pieces for cello and river recordings, self-released. Written mostly while running.',
      media: [{ type: 'art', caption: 'Cover: Long Rivers' }, { type: 'audio', label: 'Side A excerpt (sample)' }, { type: 'link', label: 'Listen on Bandcamp (sample link)' }] },
    { id: 'm6', t: 'music', kind: 'project', title: 'Score for “Harbour” (short film)', start: '2023', end: '2023', include: true, publishedAt: '2026-01-10',
      desc: 'Twelve minutes of music for a neighbour’s documentary about the last ferry workers.' },
    { id: 'm5', t: 'music', kind: 'creation', title: 'Salt Light, second EP (in progress)', start: '2025', end: null, include: true, publishedAt: '2026-08-30',
      desc: 'Six tracks recorded at home around a toddler’s nap schedule. Four are done.',
      media: [{ type: 'audio', label: 'Rough mix: “Roof Hives” (sample)' }] },

    /* Family & friends */
    { id: 'p1', t: 'people', kind: 'milestone', title: 'Moved to Lisbon', start: '2019', end: '2019', include: true, publishedAt: '2026-01-10',
      desc: 'Left Oslo with two suitcases and a cello case.' },
    { id: 'p3', t: 'people', kind: 'practice', title: 'Sunday dinners', start: '2021', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'A long table on the roof terrace. Whoever turns up, cooks.' },
    { id: 'p2', t: 'people', kind: 'milestone', title: 'Became a parent', start: '2024', end: '2024', include: true, publishedAt: '2026-01-10',
      desc: 'Her son arrived in March 2024. Everything else rearranged itself around him.' },
    { id: 'p4', t: 'people', kind: 'milestone', title: 'A year of recovery', start: '2019', end: '2019', include: false, private: true, publishedAt: null,
      desc: 'Private note. Not published.' },

    /* Running */
    { id: 'r1', t: 'running', kind: 'practice', title: 'Running before sunrise', start: '2019', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Most days, 6 a.m., along the Tagus. Twenty minutes or two hours.' },
    { id: 'r2', t: 'running', kind: 'milestone', title: 'First marathon, Lisbon', start: '2022', end: '2022', include: true, publishedAt: '2026-01-10',
      desc: '4:21. Walked the last bridge, cried at the finish, signed up for the next one that evening.' },
    { id: 'r3', t: 'running', kind: 'community', title: 'Pacing new runners at parkrun', start: '2023', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Runs at the back of the pack on Saturday mornings so nobody finishes alone.' },

    /* Community */
    { id: 'c1', t: 'community', kind: 'community', title: 'Rua Verde community garden', start: '2019', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Joined in her first month in Lisbon; co-organizer since 2021. Forty plots, one shared shed, endless meetings.' },
    { id: 'c4', t: 'community', kind: 'creation', title: 'The garden’s seed library', start: '2023', end: '2023', include: true, publishedAt: '2026-01-10',
      desc: 'A cabinet of labelled seed packets anyone can borrow from and return to at harvest.',
      media: [{ type: 'art', caption: 'Seed library drawers' }] },
    { id: 'c2', t: 'community', kind: 'community', title: 'Saturday Code Club', start: '2021', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'Volunteer teacher for 10–14 year olds at the local library. Games, robots, and a lot of patience.' },
    { id: 'c3', t: 'community', kind: 'project', title: 'Accessible Code Club curriculum', start: '2024', end: null, include: true, publishedAt: '2026-05-20',
      desc: 'Rewriting the club’s lessons so kids who use screen readers or switch controls can take part fully.' },

    /* Letters & clay */
    { id: 'k3', t: 'making', kind: 'creation', title: 'Cover lettering for Long Rivers', start: '2021', end: '2021', include: true, publishedAt: '2026-01-10',
      desc: 'Hand-set wood type, printed on the Porto workshop’s proof press, scanned for the EP cover.' },
    { id: 'k1', t: 'making', kind: 'practice', title: 'Wheel-thrown ceramics', start: '2022', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'A shared studio two streets away. Mostly bowls. Mostly slightly wonky.' },
    { id: 'k2', t: 'making', kind: 'creation', title: 'Halvor Grotesk (typeface in progress)', start: '2023', end: null, include: true, publishedAt: '2026-01-10',
      desc: 'A sans-serif drawn for signs that are read from a moving tram. Regular and bold are done; italic is next.',
      media: [{ type: 'art', caption: 'Specimen: Halvor Grotesk Regular', glyph: 'Aa' }] },

    /* Theatre */
    { id: 't1', t: 'theatre', kind: 'practice', title: 'Youth theatre, Bergen', start: '2001', end: '2006', include: true, publishedAt: '2026-01-10',
      desc: 'Acting badly, then building sets well. The workshop felt more like home than the stage.' },
    { id: 't2', t: 'theatre', kind: 'role', title: 'Set designer, Teatro Pequeno', start: '2014', end: '2019', include: true, publishedAt: '2026-01-10',
      desc: 'Designed eleven productions for an amateur company, on budgets measured in plywood sheets.' },
    { id: 't3', t: 'theatre', kind: 'milestone', title: 'Last show: “The Lighthouse Keepers”', start: '2019', end: '2019', include: true, publishedAt: '2026-01-10',
      desc: 'The final set before moving to Lisbon: a lighthouse that turned on stage.' },

    /* Beekeeping */
    { id: 'b1', t: 'bees', kind: 'study', title: 'Beginner beekeeping course', start: '2026', end: '2026', include: true, publishedAt: '2026-09-12',
      desc: 'Six Saturdays with the city beekeepers’ association. Stung twice, hooked anyway.' },
    { id: 'b2', t: 'bees', kind: 'practice', title: 'Two hives on the garden roof', start: '2026', end: null, include: true, publishedAt: '2026-09-12',
      desc: 'Installed in May. Named Fado and Fita by the code-club kids.' },

    /* Profile content not yet chosen for the Constellation */
    { id: 'x1', t: 'work', kind: 'role', title: 'Design intern, Oslo municipality', start: '2009', end: '2009', include: false, publishedAt: null,
      desc: 'Summer internship on a parking permits form.' }
  ],

  /* status: 'confirmed' (owner-approved, visible) or 'suggested' (owner-only, never shown to visitors).
   * origin: 'owner' wrote it; 'suggestion' was proposed by EverAtlas and awaits the owner. */
  connections: [
    { id: 'n1', from: 't1', to: 'l1', rel: 'changed_direction', status: 'confirmed', origin: 'owner',
      note: 'Building sets at fifteen is the reason I studied architecture.' },
    { id: 'n2', from: 'l1', to: 'w1', rel: 'led_to', status: 'confirmed', origin: 'owner',
      note: 'My thesis on station signage got me the interview.' },
    { id: 'n3', from: 'm2', to: 'w5', rel: 'inspired', status: 'confirmed', origin: 'owner',
      note: 'The tram’s stop sounds started as recordings from my morning walks.' },
    { id: 'n4', from: 'r1', to: 'm4', rel: 'inspired', status: 'confirmed', origin: 'owner',
      note: 'Most of the EP was written in my head on long runs by the river.' },
    { id: 'n5', from: 'l2', to: 'k2', rel: 'led_to', status: 'confirmed', origin: 'owner',
      note: 'I came home from Porto and started drawing letters the same week.' },
    { id: 'n6', from: 'k3', to: 'm4', rel: 'fed_into', status: 'confirmed', origin: 'owner',
      note: 'The first thing I ever printed became the cover.' },
    { id: 'n7', from: 'c2', to: 'w8', rel: 'developed', status: 'confirmed', origin: 'owner',
      note: 'If a twelve-year-old can’t follow it, neither can a tired adult.' },
    { id: 'n8', from: 'p1', to: 'c1', rel: 'led_to', status: 'confirmed', origin: 'owner',
      note: 'I joined the garden to meet my neighbours in my first month.' },
    { id: 'n9', from: 'c1', to: 'b1', rel: 'led_to', status: 'confirmed', origin: 'owner',
      note: 'The garden needed pollinators. I volunteered before I knew what I was doing.' },
    { id: 'n10', from: 'c1', to: 'm6', rel: 'led_to', status: 'confirmed', origin: 'owner',
      note: 'The director heard Salt Choir play at a garden party.' },
    { id: 'n11', from: 'w3', to: 'l4', rel: 'led_to', status: 'confirmed', origin: 'owner',
      note: 'Testing with older adults showed me how much I didn’t know.' },
    { id: 'n12', from: 'l4', to: 'c3', rel: 'shaped', status: 'confirmed', origin: 'owner',
      note: 'The same principles, for eleven-year-olds.' },
    { id: 'n13', from: 'w5', to: 'w9', rel: 'led_to', status: 'confirmed', origin: 'owner', note: '' },
    { id: 'n14', from: 't2', to: 'w5', rel: 'shaped', status: 'confirmed', origin: 'owner',
      note: 'Sets taught me to design for people moving through a space.' },

    /* Owner-only: hidden because one end is private */
    { id: 'n15', from: 'p4', to: 'r1', rel: 'changed_direction', status: 'confirmed', origin: 'owner',
      note: 'Private.' },

    /* Suggestions awaiting the owner. Never shown to visitors. */
    { id: 's1', from: 'k1', to: 'w7', rel: 'developed', status: 'suggested', origin: 'suggestion',
      note: '' , why: 'Both involve repeated making and letting others shape the result.' },
    { id: 's2', from: 'r2', to: 'm5', rel: 'inspired', status: 'suggested', origin: 'suggestion',
      note: '', why: 'The EP started a few years after the marathon.' },
    { id: 's3', from: 'p2', to: 'k1', rel: 'changed_direction', status: 'suggested', origin: 'suggestion',
      note: '', why: 'Both are recent changes.' }
  ],

  horizon: [
    { id: 'h1', t: 'music', title: 'Release Salt Light', when: 'Spring 2027' },
    { id: 'h2', t: 'community', title: 'Open-source the accessible curriculum', when: '2027' },
    { id: 'h3', t: 'bees', title: 'First honey harvest', when: 'Summer 2027' },
    { id: 'h4', t: 'work', title: 'Mentor two junior designers', when: 'Ongoing' },
    { id: 'h5', t: 'making', title: 'Finish the Halvor Grotesk italic', when: 'Someday soon' }
  ],

  updates: [
    { date: '2026-09-12', text: 'Added Beekeeping as a new part of life.' },
    { date: '2026-08-30', text: 'Shared the second EP, Salt Light, as a work in progress.' },
    { date: '2026-08-04', text: 'Marked Theatre as resting for now.' }
  ]
};
