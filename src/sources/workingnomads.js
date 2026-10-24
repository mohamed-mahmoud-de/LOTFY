// Remote jobs; the URL redirects straight to the employer's page. Free, no key. No job-type field,
// so the part-time check in filter.js relies on the title/description.
export async function fetchWorkingNomads() {
  const res = await fetch('https://www.workingnomads.com/api/exposed_jobs/');
  if (!res.ok) throw new Error(`Working Nomads HTTP ${res.status}`);
  return (await res.json()).map((j) => ({
    id: `workingnomads:${j.url}`,
    source: 'Working Nomads',
    title: j.title,
    company: j.company_name,
    location: j.location,
    remote: true,
    type: null,
    description: j.description,
    url: j.url,
    logo: null,
    pay: null,
    postedAt: new Date(j.pub_date),
  }));
}
