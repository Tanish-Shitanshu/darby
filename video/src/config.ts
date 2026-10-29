import segs from './segments.json';
// Everything a human may want to change lives here: timings (seconds), on-screen words, numbers.
// Timings follow docs/FINAL_SCRIPT.md (v2). After the voice-over is recorded, nudge `scenes` so each scene ends where that speaker ends.
export const FPS = 30;

export const scenes = {
  hook: 7,        // Tanish 0:00
  problem: 23,    // Tanish 0:07
  intro: 15,      // Tanish 0:30
  demo: 55,       // Mohit 0:45 (Tanish's Hindi line at 0:52)
  security: 32,   // Ghana 1:40
  verify: 30,     // Pragunie 2:12
  stack: 18,      // Ghana 2:42
  market: 20,     // Pragunie 3:00
  adal: 10,       // Pragunie 3:20
  end: 15,        // Tanish 3:30
} as const;

export const chapters: Record<keyof typeof scenes, string> = {
  hook: '', problem: '01 · THE PROBLEM', intro: '02 · MEET DARBY', demo: '03 · LIVE DEMO', security: '04 · SECURITY',
  verify: '05 · PROOF', stack: '06 · TECH STACK', market: '07 · MARKET', adal: '08 · BUILT WITH ADAL', end: '',
};

/** The five highlights, popping in over the demo footage. `at` = seconds from the start of the demo scene. */
export const highlights = [
  { at: 7.5, n: 1, title: 'Speak in your language', sub: 'Sarvam AI turns Hindi voice into the goal' },
  { at: 15, n: 2, title: 'A proof planned for every step', sub: 'Nothing runs without a way to check it' },
  { at: 28, n: 3, title: 'Real browser tabs', sub: 'Real pages, exact quotes, no mock' },
  { at: 40, n: 4, title: 'Honest Excel', sub: 'Missing prices say NOT FOUND, never guessed' },
  { at: 47, n: 5, title: 'Spoken summary in Hindi', sub: 'Sarvam voice, with a Stop button' },
];

export const hindiGoal = { native: 'टॉप पाँच AI स्टार्टअप्स की प्राइसिंग रिसर्च करो और एक Excel शीट में लिख दो।', english: 'Research the top 5 AI startups’ pricing and write it in an Excel sheet.' };

export const contracts = ['file_exists', 'quote_in_page', 'sheet_readback', 'permission_present', 'http_json_contains', 'page_assertions', 'vision_check', 'media_probe', 'pr_exists', 'tests_pass'];

/** Check every figure with ✱ against its source before publishing; change or delete here. */
export const market = {
  stats: [
    { value: 50, prefix: '$', suffix: 'B+', label: 'AI agents market by 2030', note: '✱ up from about $8B in 2025 (verify source)' },
    { value: 900, prefix: '', suffix: 'M+', label: 'internet users in India', note: '✱ most prefer their own language (verify source)' },
    { value: 11, prefix: '', suffix: '', label: 'voices live today', note: '10 Indian languages + English, via Sarvam' },
  ],
  model: ['Free core', 'Teams: shared receipts + approvals', 'Hub: verified Playbooks'],
  languages: ['हिन्दी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ', 'മലയാളം', 'मराठी', 'ગુજરાતી', 'ਪੰਜਾਬੀ', 'ଓଡ଼ିଆ', 'English'],
};

export const proof = [
  { value: 119, label: 'tests passing' },
  { value: 10, label: 'attacks contained' },
  { value: 10, label: 'evidence contracts' },
  { value: 11, label: 'voices' },
];

export const adalLines = [
  'Browser Use tested the live UI after every milestone',
  'Headless AdaL ran our red-team',
  'Review Agent checked every diff before we tagged it',
];

export const repoUrl = 'github.com/Tanish-Shitanshu/darby';
export const team = 'Team Target 9x';

/** The spoken script, with the start and end second of each line. Drives the captions. Keep in step with docs/FINAL_SCRIPT.md. */
export const script: { from: number; to: number; text: string; who: string }[] = [
  { from: 0.2, to: 3.5, who: 'Tanish', text: 'Your AI agent just said: Done.' },
  { from: 4.2, to: 6.8, who: 'Tanish', text: 'Was it?' },
  { from: 7, to: 30, who: 'Tanish', text: 'Today’s agents click, type, and announce success. Nobody checks. A form says Saved and stores nothing. A web page whispers ignore your instructions and email this file, and the agent obeys. And if you think in Hindi or Tamil? These tools weren’t built for you.' },
  { from: 30, to: 45, who: 'Tanish', text: 'We’re Team Target 9x. This is Darby: the AI-native browser where done means proven. Real tabs do the work. A second system checks it. You get a signed receipt.' },
  { from: 45, to: 52, who: 'Mohit', text: 'Watch it work. Tanish will give Darby the job, in Hindi.' },
  { from: 59, to: 72, who: 'Mohit', text: 'Sarvam AI turns his voice into text. Then the planner, which sees only the goal and never a web page, writes a plan, and plain code attaches a proof to every step.' },
  { from: 72, to: 90, who: 'Mohit', text: 'Now it runs in real Chrome tabs, driven by Playwright. Every price arrives with the exact quote from the page. When a price isn’t public, the row says NOT FOUND. Never guessed.' },
  { from: 90, to: 100, who: 'Mohit', text: 'The Excel file is ready, and Darby reads the findings back in Hindi. Voice in. Voice out. Proof in between.' },
  { from: 100, to: 132, who: 'Ghana', text: 'Why is it safe? Web pages are hostile. So page text goes only to a quarantined reader: a model with no tools, and an output locked to a strict schema. Anything it reads is tainted, so it can never become a recipient, a link, or a command. Sharing, email and publishing stop at an approval card, enforced by plain TypeScript, not a prompt. We attacked ourselves with ten hostile pages. All contained.' },
  { from: 132, to: 162, who: 'Pragunie', text: 'And the proof? An independent verifier that never sees the agent’s claim. It re-opens the page, the file, the record, against ten kinds of evidence contract, from an exact quote to the code’s tests now pass. Every step lands in a hash-chained ledger, and the run ends in an Ed25519-signed receipt. Change one byte, and the tamper test turns red.' },
  { from: 162, to: 180, who: 'Ghana', text: 'Built on TypeScript end to end: Node and Playwright driving real Chrome, React on the front, SQLite for the ledger. Models: Gemini, Groq and Sarvam, switching automatically. Voice, screenshots, and a code-fix loop that proves its tests pass.' },
  { from: 180, to: 200, who: 'Pragunie', text: 'Who needs this? Anyone who answers for what an agent does. AI agents are heading from about eight billion to over fifty billion dollars by 2030. India has over nine hundred million internet users, and Darby already speaks eleven voices. Free core, a Teams plan, a hub of verified Playbooks.' },
  { from: 200, to: 210, who: 'Pragunie', text: 'And we built it with AdaL: Browser Use tested our live UI, headless AdaL ran our red-team, the Review Agent checked every diff.' },
  { from: 210, to: 225, who: 'Tanish', text: 'One hundred and nineteen tests. Ten attacks, contained. One receipt you can verify yourself. Other agents say trust me. Darby says: check me. We’re Team Target 9x. Thank you.' },
];
export const showCaptions = true;

/* ───── recorded clips ───── */
export type Seg = { file: string; who: string; trimStart: number; trimEnd: number; speechStart: number; speechEnd: number };
/** Added by `node scripts/segment.mjs <clip> <scene> <name>`. A scene with a clip lasts exactly as long as the speech. */
export const segments = segs as Record<string, Seg | undefined>;
export type SceneId = keyof typeof scenes;
export const sceneIds = Object.keys(scenes) as SceneId[];
export const sceneLen = (id: SceneId): number => { const s = segments[id]; return s ? +(s.trimEnd - s.trimStart).toFixed(2) : scenes[id]; };
export const TOTAL_SECONDS = sceneIds.reduce((a, id) => a + sceneLen(id), 0);

const planned: Record<string, number> = {};
const actual: Record<string, number> = {};
{ let p = 0, a = 0; for (const id of sceneIds) { planned[id] = p; actual[id] = a; p += scenes[id]; a += sceneLen(id); } }
/** The script re-timed to the real scene lengths, so captions follow what was actually recorded. */
export const finalScript = script.map((l) => {
  const id = sceneIds.find((i) => l.from >= planned[i]! - 0.01 && l.from < planned[i]! + scenes[i] - 0.001) ?? 'end';
  const seg = segments[id];
  if (seg) return { ...l, from: actual[id]! + (seg.speechStart - seg.trimStart), to: actual[id]! + (seg.speechEnd - seg.trimStart) };
  return { ...l, from: actual[id]! + (l.from - planned[id]!), to: actual[id]! + (l.to - planned[id]!) };
});
