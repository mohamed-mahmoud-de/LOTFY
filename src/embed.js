import { EmbedBuilder } from 'discord.js';
import { isTech, workplace } from './filter.js';

const TECH_INTROS = [
  'Someone wants to pay you to stare at code. Revolutionary.',
  'A company needs a dev part-time. They probably also need a miracle, but this is a start.',
  'Fresh job drop. Your GitHub with 3 forks of todo apps is finally being called upon.',
  'They said "junior-friendly". They always say that. Apply anyway.',
  'Time to update that CV you swore you updated last semester.',
  'Imagine getting paid for the bugs you were going to write anyway.',
];
const NON_TECH_INTROS = [
  'A real job. With humans. Try not to panic.',
  'Someone will pay you to exist a few hours a week. Shocking, I know.',
  'Not a single line of code required. Your laptop can finally rest.',
  'Part-time job spotted in the wild. Approach slowly, it might be real.',
  'Your bank account sent me. It said "please".',
  'This could fund at least three emergency koshary runs.',
];
const FOOTERS = [
  'Apply before your 8am lecture kills your motivation',
  'Lofty found this so you can keep procrastinating efficiently',
  'Not financial advice. Just financial desperation',
  'Remember: "competitive salary" is a mood, not a number',
  'Your future self is begging you to click Apply',
  'Posted by a bot with more ambition than you',
];
const NO_SALARY = [
  'Not disclosed. Probably paid in "exposure".',
  'A mystery. Like your attendance record.',
  'They forgot to mention it. Twice, probably.',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// Job APIs return HTML; Discord wants plain text.
export const plain = (html = '') =>
  html
    .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/Â(?=[\s ])/g, '') // Remote OK double-encodes non-breaking spaces as "Â "
    .replace(/&nbsp;| /g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&hellip;/g, '…')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// { min, max, currency, period } -> "25 USD / hourly", "350+ USD / monthly", "84,000–97,000 USD / yearly"
export function payText(pay) {
  const [min, max] = [Number(pay?.min) || 0, Number(pay?.max) || 0];
  if (!min && !max) return null;
  const n = (v) => v.toLocaleString('en-US');
  const range = !max ? `${n(min)}+` : !min ? `up to ${n(max)}` : min === max ? n(min) : `${n(min)}–${n(max)}`;
  return [range, pay.currency, pay.period && `/ ${pay.period}`].filter(Boolean).join(' ');
}

export function jobEmbed(job) {
  const tech = isTech(job);
  const embed = new EmbedBuilder()
    .setColor(tech ? 0x5865f2 : 0xf39c12)
    .setAuthor({ name: tech ? '🖥️ Technical part-time job' : '🧹 Non-technical part-time job' })
    .setTitle(clip(plain(job.title), 256))
    .setURL(job.url)
    .setDescription(`*${pick(tech ? TECH_INTROS : NON_TECH_INTROS)}*\n\n${clip(plain(job.description), 600) || 'No description. Living dangerously.'}`)
    .addFields(
      { name: '🏢 Company', value: clip(plain(job.company) || 'Anonymous (suspicious)', 1024), inline: true },
      { name: '📍 Location', value: clip(job.location || 'Somewhere on Earth', 1024), inline: true },
      { name: '🏠 Workplace', value: workplace(job), inline: true },
      { name: '⏰ Type', value: clip(job.type || 'Part-time', 1024), inline: true },
      { name: '💸 Pay', value: clip(payText(job.pay) || pick(NO_SALARY), 1024), inline: true },
      { name: '🔗 Apply', value: `[Open on ${job.source}](${job.url})`, inline: true },
    )
    .setFooter({ text: `${pick(FOOTERS)} • via ${job.source}` });
  if (!Number.isNaN(job.postedAt.getTime())) embed.setTimestamp(job.postedAt);
  if (job.logo?.startsWith('https://')) embed.setThumbnail(job.logo);
  return embed;
}
