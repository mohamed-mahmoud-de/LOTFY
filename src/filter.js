const PART_TIME = /part[\s-]?time|دوام جزئي|بارت ?تايم/i;
const REMOTE = /remote|online|work from home|من المنزل|عن بعد|اونلاين|أونلاين/i;
const FULL_TIME = /full[\s-]?time|دوام كامل/i;
const TECH = /\b(developer|engineer(ing)?|software|programmer|front[\s-]?end|back[\s-]?end|full[\s-]?stack|web|devops|qa|tester|cyber|security|network|cloud|ai|ml|machine learning|data (scien\w*|analy\w*|engineer\w*)|python|javascript|typescript|react|node(\.js)?|java|php|android|ios|ui|ux|sql|database|sysadmin)\b|مبرمج|مطور|برمجة|تقني|شبكات/i;
const IT = /\bIT\b/; // case-sensitive, or it matches the word "it"
const HYBRID = /hybrid|هجين/i;
const OPEN_TO_EGYPT = /anywhere|worldwide|global|emea|egypt|africa|middle east|mena|alexandria|مصر|الإسكندرية/i;
const ENGLISH_WORDS = /\b(the|and|you|your|we|our|with|for|to|of|is|are|will)\b/gi;
const OTHER_WORDS = /\b(und|der|das|wir|sie|für|mit|ist|ein|eine|el|los|las|para|con|somos|una|que|et|les|nous|pour|avec|est|une|vous)\b/gi;
const ARABIC = /[؀-ۿ]/;
// A month, not a week: Alexandria only gets a handful of part-time posts a month.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// The title wins; then a full-time title or type rules it out; then the type or description.
// Google often labels part-time posts "full-time", so a part-time title beats the type.
export const isPartTime = (job) => {
  if (PART_TIME.test(job.title)) return true;
  if (FULL_TIME.test(`${job.title} ${job.type ?? ''}`)) return false;
  return /part/i.test(job.type ?? '') || PART_TIME.test(`${job.type ?? ''} ${job.description ?? ''}`);
};

// Title only: source categories are too noisy (recruiters get tagged as tech).
export const isTech = (job) => TECH.test(job.title) || IT.test(job.title);

// No location listed means no restriction.
export const openToEgypt = (job) => !job.location || OPEN_TO_EGYPT.test(job.location);

// shortcut: stopword count, not real language detection; swap in a detector if German/Spanish posts still slip through.
export const isEnglishOrArabic = (job) => {
  const text = `${job.title} ${job.description ?? ''}`;
  if (ARABIC.test(text)) return true;
  return (text.match(ENGLISH_WORDS)?.length ?? 0) >= (text.match(OTHER_WORDS)?.length ?? 0);
};

export const workplace = (job) => {
  if (HYBRID.test(`${job.title} ${job.description ?? ''}`)) return 'Hybrid';
  return job.remote || REMOTE.test(job.title) ? 'Remote' : 'On-site';
};

// Newest unseen part-time jobs from the last month that Egypt can apply to, in English or Arabic,
// de-duplicated across sources, capped so the channel isn't flooded.
// Jobs over the cap stay unseen and go out next cycle.
export function pickNew(jobs, seen, { now = Date.now(), limit = 10 } = {}) {
  const sameJob = new Set();
  const time = (j) => (Number.isNaN(j.postedAt.getTime()) ? now : j.postedAt.getTime());
  return jobs
    .filter((j) => {
      const key = `${j.title}|${j.company}`.toLowerCase();
      if (seen.has(j.id) || sameJob.has(key) || !j.url) return false;
      sameJob.add(key);
      return now - time(j) <= MAX_AGE_MS && isPartTime(j) && openToEgypt(j) && isEnglishOrArabic(j);
    })
    .sort((a, b) => time(b) - time(a))
    .slice(0, limit);
}
