const PART_TIME = /part[\s-]?time|دوام جزئي|بدوام جزئي/i;
const FULL_TIME = /full[\s-]?time|دوام كامل/i;
const TECH = /\b(developer|engineer(ing)?|software|programmer|front[\s-]?end|back[\s-]?end|full[\s-]?stack|web|devops|qa|tester|cyber|security|network|cloud|ai|ml|machine learning|data (scien\w*|analy\w*|engineer\w*)|python|javascript|typescript|react|node(\.js)?|java|php|android|ios|ui|ux|sql|database|sysadmin)\b|مبرمج|مطور|برمجة|تقني|شبكات/i;
const IT = /\bIT\b/; // case-sensitive, or it matches the word "it"
const HYBRID = /hybrid|هجين/i;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const isPartTime = (job) =>
  !FULL_TIME.test(job.title) && (/part/i.test(job.type ?? '') || PART_TIME.test(`${job.title} ${job.description ?? ''}`));

// Title only: source categories are too noisy (Himalayas tags recruiters as tech).
export const isTech = (job) => TECH.test(job.title) || IT.test(job.title);

export const workplace = (job) => {
  if (HYBRID.test(`${job.title} ${job.description ?? ''}`)) return 'Hybrid';
  return job.remote ? 'Remote' : 'On-site';
};

// Newest unseen part-time jobs from the last week, de-duplicated across sources, capped so the channel isn't flooded.
// Jobs over the cap stay unseen and go out next cycle.
export function pickNew(jobs, seen, { now = Date.now(), limit = 10 } = {}) {
  const sameJob = new Set();
  const time = (j) => (Number.isNaN(j.postedAt.getTime()) ? now : j.postedAt.getTime());
  return jobs
    .filter((j) => {
      const key = `${j.title}|${j.company}`.toLowerCase();
      if (seen.has(j.id) || sameJob.has(key) || !j.url) return false;
      sameJob.add(key);
      return now - time(j) <= MAX_AGE_MS && isPartTime(j);
    })
    .sort((a, b) => time(b) - time(a))
    .slice(0, limit);
}
