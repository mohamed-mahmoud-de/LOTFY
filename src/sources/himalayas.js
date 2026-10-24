// Remote part-time jobs that hire from Egypt. Free, no key. Their terms ask us to credit + link back.
const URL = 'https://himalayas.app/jobs/api/search?employment_type=Part%20Time&country=Egypt&sort=recent';

export async function fetchHimalayas() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Himalayas HTTP ${res.status}`);
  const { jobs } = await res.json();
  return jobs.map((j) => ({
    id: `himalayas:${j.guid}`,
    source: 'Himalayas',
    title: j.title,
    company: j.companyName,
    location: j.locationRestrictions?.length ? j.locationRestrictions.join(', ') : 'Anywhere',
    remote: true,
    type: j.employmentType,
    description: j.excerpt || j.description,
    url: j.applicationLink,
    logo: j.companyLogo,
    salary: j.minSalary ? `${j.minSalary}–${j.maxSalary ?? '?'} ${j.currency ?? ''}/${j.salaryPeriod ?? ''}` : null,
    postedAt: new Date(j.pubDate * 1000),
  }));
}
