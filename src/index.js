import { Client, Events, GatewayIntentBits } from 'discord.js';
import { jobEmbed } from './embed.js';
import { pickNew } from './filter.js';
import { fetchJobicy } from './sources/jobicy.js';
import { fetchJSearch } from './sources/jsearch.js';
import { fetchRemoteOK } from './sources/remoteok.js';
import { fetchWorkingNomads } from './sources/workingnomads.js';
import { loadState, saveState } from './state.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: fall back to real environment variables.
}

const { DISCORD_TOKEN, JOBS_CHANNEL_ID, RAPIDAPI_KEY } = process.env;
if (!DISCORD_TOKEN || !JOBS_CHANNEL_ID) {
  console.error('Missing DISCORD_TOKEN or JOBS_CHANNEL_ID. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const HOUR = 60 * 60 * 1000;
const CHECK_EVERY = 0.5 * HOUR;
// JSearch free tier is ~200 requests/month; 2 queries every 12h ≈ 120/month.
const SOURCES = [
  { name: 'jobicy', fetch: fetchJobicy, every: CHECK_EVERY },
  { name: 'remoteok', fetch: fetchRemoteOK, every: CHECK_EVERY },
  { name: 'workingnomads', fetch: fetchWorkingNomads, every: CHECK_EVERY },
  ...(RAPIDAPI_KEY ? [{ name: 'jsearch', fetch: fetchJSearch, every: 12 * HOUR }] : []),
];
if (!RAPIDAPI_KEY) console.warn('RAPIDAPI_KEY not set: skipping JSearch (no LinkedIn/Indeed/local jobs).');

const state = await loadState();

async function checkJobs(channel) {
  const now = Date.now();
  const due = SOURCES.filter((s) => now - (state.lastRun[s.name] ?? 0) >= s.every - 60_000);
  const results = await Promise.allSettled(due.map((s) => s.fetch()));
  const jobs = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      jobs.push(...r.value);
      state.lastRun[due[i].name] = now;
    } else {
      console.error(`${due[i].name} failed:`, r.reason.message);
    }
  });

  const fresh = pickNew(jobs, state.seen, { now });
  for (const job of fresh) {
    try {
      await channel.send({ embeds: [jobEmbed(job)] });
      state.seen.add(job.id);
    } catch (err) {
      console.error(`Could not post "${job.title}":`, err.message);
    }
  }
  await saveState(state);
  console.log(`[${new Date().toISOString()}] checked ${due.map((s) => s.name).join(', ') || 'nothing'}: ${jobs.length} jobs, posted ${fresh.length}`);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`Lofty online as ${c.user.tag}`);
  const channel = await c.channels.fetch(JOBS_CHANNEL_ID).catch(() => null);
  if (!channel?.isSendable()) {
    console.error(`Channel ${JOBS_CHANNEL_ID} not found or Lofty can't send there. Check the ID and the bot's permissions.`);
    process.exit(1);
  }
  const run = () => checkJobs(channel).catch((err) => console.error('Job check crashed:', err));
  run();
  setInterval(run, CHECK_EVERY);
});

client.login(DISCORD_TOKEN);
