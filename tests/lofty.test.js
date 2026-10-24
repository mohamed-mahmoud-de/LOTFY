import assert from 'node:assert/strict';
import { test } from 'node:test';
import { jobEmbed, plain } from '../src/embed.js';
import { isPartTime, isTech, pickNew, workplace } from '../src/filter.js';

const NOW = Date.parse('2026-10-24T00:00:00Z');
const job = (over = {}) => ({
  id: 'x:1', source: 'Test', title: 'Junior React Developer', company: 'Acme', location: 'Alexandria, Egypt',
  remote: false, type: 'Part Time', description: '<p>Build things &amp; ship.</p>',
  url: 'https://example.com/job', logo: null, salary: null, postedAt: new Date(NOW - 3600_000), ...over,
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
  ];
  const picked = pickNew(jobs, new Set(['e']), { now: NOW });
  assert.deepEqual(picked.map((j) => j.id), ['g', 'b', 'a']);
  assert.equal(pickNew(jobs, new Set(), { now: NOW, limit: 1 }).length, 1);
});

test('plain strips HTML', () => {
  assert.equal(plain('<p>Hi &amp; bye</p><ul><li>one</li></ul>'), 'Hi & bye\none');
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
