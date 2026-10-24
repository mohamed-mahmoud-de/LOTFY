// JSearch (RapidAPI) reads Google for Jobs, so it covers LinkedIn, Indeed, Wuzzuf, Dubizzle, Naukrigulf, etc.
// One English and one Arabic query; each only returns results with its matching `language`.
// No employment_types filter: Alexandria has few postings and filter.js already checks for part-time.
const QUERIES = [
  { query: 'part time jobs in Alexandria, Egypt', language: 'en' },
  { query: 'وظائف دوام جزئي في الإسكندرية', language: 'ar' },
];
// Google mixes in Alexandria, Virginia.
const NOT_EGYPT = /virginia|\bVA\b|united states/i;

export async function fetchJSearch() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return [];
  // One at a time with a pause: firing both at once hits RapidAPI's per-second limit (HTTP 429).
  const jobs = [];
  for (const [i, q] of QUERIES.entries()) {
    if (i) await new Promise((r) => setTimeout(r, 1500));
    const params = new URLSearchParams({ ...q, country: 'eg', date_posted: 'month', num_pages: '1' });
    const res = await fetch(`https://jsearch.p.rapidapi.com/search-v2?${params}`, {
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' },
    });
    if (res.status === 403) throw new Error('JSearch 403: subscribe to the free Basic plan at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing');
    if (!res.ok) throw new Error(`JSearch HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    jobs.push(...((await res.json()).data?.jobs ?? []));
  }
  return jobs
    .filter((j) => !NOT_EGYPT.test(`${j.job_title} ${j.employer_name}`))
    .map((j) => ({
      id: `jsearch:${j.job_id}`,
      source: j.job_publisher ? `${j.job_publisher} (via JSearch)` : 'JSearch',
      title: j.job_title,
      company: j.employer_name,
      // Locations can be just a neighbourhood ("Al Ibrahimiyyah"), so add the country for the Egypt check.
      // Arabic results look like "الإسكندرية • عبر LinkedIn" ("via LinkedIn"); keep the part before the dot.
      location: [(j.job_location || j.job_state || '').split('•')[0].trim(), 'Egypt'].filter(Boolean).join(', '),
      remote: Boolean(j.job_is_remote),
      type: j.job_employment_type,
      description: j.job_description,
      url: j.job_apply_link,
      logo: j.employer_logo,
      pay: { min: j.job_min_salary, max: j.job_max_salary, currency: j.job_salary_currency, period: j.job_salary_period },
      // Invalid Date when neither field exists; the filter keeps those (the query is already limited to the last month).
      // Arabic results have no date at all; NaN, not null*1000 = 1970.
      postedAt: new Date(j.job_posted_at_datetime_utc ?? (j.job_posted_at_timestamp ? j.job_posted_at_timestamp * 1000 : NaN)),
    }));
}
