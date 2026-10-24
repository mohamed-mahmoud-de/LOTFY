// JSearch (RapidAPI) reads Google for Jobs, so it covers LinkedIn, Indeed, Glassdoor, Wuzzuf, etc.
// One English and one Arabic query, because Egyptian posts come in both.
const QUERIES = ['part time jobs in Alexandria, Egypt', 'وظائف دوام جزئي في الإسكندرية'];

export async function fetchJSearch() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return [];
  // One at a time with a pause: firing both at once hits RapidAPI's per-second limit (HTTP 429).
  const jobs = [];
  for (const [i, query] of QUERIES.entries()) {
    if (i) await new Promise((r) => setTimeout(r, 1500));
    const params = new URLSearchParams({ query, country: 'eg', employment_types: 'PARTTIME', date_posted: 'week', num_pages: '1' });
    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' },
    });
    if (res.status === 403) throw new Error('JSearch 403: subscribe to the free Basic plan at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing');
    if (!res.ok) throw new Error(`JSearch HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    jobs.push(...((await res.json()).data ?? []));
  }
  return jobs.map((j) => ({
    id: `jsearch:${j.job_id}`,
    source: j.job_publisher ? `${j.job_publisher} (via JSearch)` : 'JSearch',
    title: j.job_title,
    company: j.employer_name,
    location: j.job_location || [j.job_city, j.job_country].filter(Boolean).join(', ') || 'Egypt',
    remote: Boolean(j.job_is_remote),
    type: j.job_employment_type,
    description: j.job_description,
    url: j.job_apply_link,
    logo: j.employer_logo,
    pay: { min: j.job_min_salary, max: j.job_max_salary, currency: j.job_salary_currency, period: j.job_salary_period },
    // Invalid Date when neither field exists; the filter keeps those (the query is already limited to this week).
    postedAt: new Date(j.job_posted_at_datetime_utc ?? j.job_posted_at_timestamp * 1000),
  }));
}
