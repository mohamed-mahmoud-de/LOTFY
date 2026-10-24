// JSearch (RapidAPI) reads Google for Jobs, so it covers LinkedIn, Indeed, Glassdoor, Wuzzuf, etc.
// One English and one Arabic query, because Egyptian posts come in both.
const QUERIES = ['part time jobs in Alexandria, Egypt', 'وظائف دوام جزئي في الإسكندرية'];

export async function fetchJSearch() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return [];
  const lists = await Promise.all(QUERIES.map(async (query) => {
    const params = new URLSearchParams({ query, country: 'eg', employment_types: 'PARTTIME', date_posted: 'week', num_pages: '1' });
    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' },
    });
    if (!res.ok) throw new Error(`JSearch HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).data ?? [];
  }));
  return lists.flat().map((j) => ({
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
