// Remote jobs. Free, no key. Their terms ask us to link back to the Remote OK page and credit them.
export async function fetchRemoteOK() {
  const res = await fetch('https://remoteok.com/api', { headers: { 'user-agent': 'Lofty Discord bot' } });
  if (!res.ok) throw new Error(`Remote OK HTTP ${res.status}`);
  const [, ...jobs] = await res.json(); // first item is their legal notice
  return jobs.map((j) => ({
    id: `remoteok:${j.id}`,
    source: 'Remote OK',
    title: j.position,
    company: j.company,
    location: j.location,
    remote: true,
    type: null,
    description: j.description,
    url: j.url,
    logo: j.company_logo || j.logo,
    pay: { min: j.salary_min, max: j.salary_max, currency: 'USD', period: 'year' },
    postedAt: new Date(j.date),
  }));
}
