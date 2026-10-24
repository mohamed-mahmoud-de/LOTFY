import assert from 'node:assert/strict';
import { test } from 'node:test';
import { jobEmbed, payText, plain } from '../src/embed.js';
import { isEnglishOrArabic, isPartTime, isTech, openToEgypt, pickNew, workplace } from '../src/filter.js';

const NOW = Date.parse('2026-10-24T00:00:00Z');
const job = (over = {}) => ({
  id: 'x:1', source: 'Test', title: 'Junior React Developer', company: 'Acme', location: 'Alexandria, Egypt',
  remote: false, type: 'Part Time', description: '<p>Build things &amp; ship.</p>',
  url: 'https://example.com/job', logo: null, pay: null, postedAt: new Date(NOW - 3600_000), ...over,
});

test('open to Egypt', () => {
  for (const location of ['Alexandria, Egypt', 'Anywhere', 'Worldwide', 'EMEA', 'الإسكندرية', '', undefined]) {
    assert.ok(openToEgypt(job({ location })), String(location));
  }
  for (const location of ['Bulgaria', 'Seattle, Washington', 'Europe, LATAM, APAC, the U.S., Canada']) {
    assert.ok(!openToEgypt(job({ location })), location);
  }
});

test('English or Arabic only', () => {
  assert.ok(isEnglishOrArabic(job()));
  assert.ok(isEnglishOrArabic(job({ title: 'كاشير', description: 'مطلوب كاشير للعمل' })));
  assert.ok(!isEnglishOrArabic(job({ title: 'Call Agent B2C', description: 'Bei uns erwarten Sie abwechslungsreiche und verantwortungsvolle Aufgaben in einem Arbeitsumfeld. Wir sind ein Team mit Erfahrung.' })));
  assert.ok(!isEnglishOrArabic(job({ title: 'Fotógrafo en España', description: 'Somos un medio digital independiente que da voz a personas reales y convierte sus historias en ayuda para quienes más lo necesitan.' })));
});

test('pay text', () => {
  assert.equal(payText(null), null);
  assert.equal(payText({ min: 0, max: 0, currency: 'USD', period: 'year' }), null);
  assert.equal(payText({ min: 9, max: 9, currency: 'USD', period: 'hourly' }), '9 USD / hourly');
  assert.equal(payText({ min: 350, currency: 'USD', period: 'monthly' }), '350+ USD / monthly');
  assert.equal(payText({ max: 500, currency: 'EGP' }), 'up to 500 EGP');
  assert.equal(payText({ min: 84000, max: 97000, currency: 'USD', period: 'yearly' }), '84,000–97,000 USD / yearly');
});

test('part-time detection', () => {
  assert.ok(isPartTime(job()));
  assert.ok(isPartTime(job({ type: undefined, title: 'كاشير بدوام جزئي' })));
  assert.ok(!isPartTime(job({ title: 'Full-time Accountant' })));
  assert.ok(!isPartTime(job({ type: 'FULLTIME', description: 'office job' })));
});

test('tech vs non-tech', () => {
  assert.ok(isTech(job()));
  assert.ok(isTech(job({ title: 'IT Support Assistant' })));
  assert.ok(isTech(job({ title: 'مطور ويب' })));
  assert.ok(!isTech(job({ title: 'Barista' })));
  assert.ok(!isTech(job({ title: 'Data Entry Clerk' })));
  assert.ok(!isTech(job({ title: 'Make it happen: Sales Rep' })));
});

test('workplace', () => {
  assert.equal(workplace(job()), 'On-site');
  assert.equal(workplace(job({ remote: true })), 'Remote');
  assert.equal(workplace(job({ description: 'Hybrid, 2 days in office' })), 'Hybrid');
});

test('pickNew dedupes, drops stale/seen/full-time, sorts newest first, caps', () => {
  const jobs = [
    job({ id: 'a', postedAt: new Date(NOW - 5 * 3600_000) }),
    job({ id: 'b', title: 'Tutor', postedAt: new Date(NOW - 1 * 3600_000) }),
    job({ id: 'c', title: 'Tutor' }), // same title+company as b from another source
    job({ id: 'd', title: 'Old job', postedAt: new Date(NOW - 8 * 86400_000) }),
    job({ id: 'e', title: 'Seen job' }),
    job({ id: 'f', title: 'Full time Driver' }),
    job({ id: 'g', title: 'No date', postedAt: new Date(NaN) }),
    job({ id: 'h', title: 'Seattle only', location: 'Seattle, Washington' }),
  ];
  const picked = pickNew(jobs, new Set(['e']), { now: NOW });
  assert.deepEqual(picked.map((j) => j.id), ['g', 'b', 'a']);
  assert.equal(pickNew(jobs, new Set(), { now: NOW, limit: 1 }).length, 1);
});

test('plain strips HTML', () => {
  assert.equal(plain('<p>Hi &amp; bye</p><ul><li>one</li></ul>'), 'Hi & bye\none');
  assert.equal(plain('PleaseÂ note'), 'Please note');
});

test('embed has the job details and respects Discord limits', () => {
  const e = jobEmbed(job({ title: 'x'.repeat(400), description: 'y'.repeat(5000) })).toJSON();
  assert.equal(e.title.length, 256);
  assert.ok(e.description.length < 4096);
  assert.equal(e.url, 'https://example.com/job');
  const names = e.fields.map((f) => f.name).join(' ');
  for (const n of ['Company', 'Location', 'Workplace', 'Type', 'Pay', 'Apply']) assert.ok(names.includes(n), n);
  assert.ok(e.footer.text.includes('via Test'));
  assert.ok(!('timestamp' in jobEmbed(job({ postedAt: new Date(NaN) })).toJSON()));
});
