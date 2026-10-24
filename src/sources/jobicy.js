// Remote jobs open to EMEA or anywhere. Free, no key. API has no part-time filter, so we filter here.
const GEOS = ['emea', 'anywhere'];

export async function fetchJobicy() {
  const lists = await Promise.all(GEOS.map(async (geo) => {
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=100&geo=${geo}`);
    if (!res.ok) throw new Error(`Jobicy HTTP ${res.status}`);
    return (await res.json()).jobs ?? [];
  }));
  return lists.flat()
    .filter((j) => j.jobType?.includes('Part-Time'))
    .map((j) => ({
      id: `jobicy:${j.id}`,
      source: 'Jobicy',
      title: j.jobTitle,
      company: j.companyName,
      location: j.jobGeo,
      remote: true,
      type: 'Part-Time',
      description: j.jobDescription || j.jobExcerpt,
      url: j.url,
      logo: j.companyLogo,
      pay: { min: j.salaryMin, max: j.salaryMax, currency: j.salaryCurrency, period: j.salaryPeriod },
      postedAt: new Date(j.pubDate),
    }));
}
