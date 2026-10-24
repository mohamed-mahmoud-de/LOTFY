import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

const DIR = new URL('../data/', import.meta.url);
const FILE = new URL('state.json', DIR);
const MAX_SEEN = 5000;

export async function loadState() {
  try {
    const { seen, lastRun } = JSON.parse(await readFile(FILE, 'utf8'));
    return { seen: new Set(seen), lastRun };
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('state.json unreadable, starting fresh:', err.message);
    return { seen: new Set(), lastRun: {} };
  }
}

// Write to a temp file and rename, so a crash mid-write can't corrupt the seen list (which would repost everything).
export async function saveState({ seen, lastRun }) {
  await mkdir(DIR, { recursive: true });
  const tmp = new URL('state.json.tmp', DIR);
  await writeFile(tmp, JSON.stringify({ seen: [...seen].slice(-MAX_SEEN), lastRun }));
  await rename(tmp, FILE);
}
