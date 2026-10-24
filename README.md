# Lofty 🧑‍🎓💸

A sarcastic Discord bot that posts **part-time jobs** (technical and non-technical) for students in **Alexandria, Egypt**: on-site, hybrid and remote, in English or Arabic.

Every 30 minutes Lofty checks the job sources, filters to fresh part-time jobs, skips anything already posted, and drops an embed in your jobs channel. Each embed shows the title, company, location, workplace, type, pay and an apply link, plus a sarcastic remark.

## Job sources

| Source | Covers | Key needed |
|---|---|---|
| [Himalayas](https://himalayas.app) | Remote part-time jobs open to Egypt | No |
| [Jobicy](https://jobicy.com) | Remote part-time jobs open to EMEA or anywhere | No |
| [JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) | Google for Jobs: LinkedIn, Indeed, Glassdoor, Wuzzuf… in Alexandria (English + Arabic queries) | `RAPIDAPI_KEY` (free tier) |

LinkedIn and Indeed have no public jobs API, and scraping them breaks their terms, so Lofty reaches them through JSearch. JSearch's free tier is about 200 requests a month, so it runs every 12 hours (≈120 requests a month).

## Setup

1. **Create the bot.** Go to <https://discord.com/developers/applications>, create a New Application, open **Bot**, and copy the token.
2. **Invite it.** Under OAuth2 → URL Generator, select the scope `bot` and the permissions `View Channel`, `Send Messages` and `Embed Links`. Open the generated URL and add the bot to your server.
3. **Get the channel ID.** Turn on Discord's Developer Mode, right-click the jobs channel, and choose Copy Channel ID.
4. **(Optional) Get a JSearch key.** Subscribe to the free plan on RapidAPI and copy your key.
5. **Configure and run.**
   ```bash
   cp .env.example .env   # fill in the values
   npm ci
   npm start
   ```

On the first run Lofty posts up to 10 jobs. Any extra jobs go out in later checks, so the channel isn't flooded.

## Server (one-time)

On a Linux server with Node 22:

```bash
npm i -g pm2
git clone https://github.com/mohamed-mahmoud-de/LOTFY.git ~/lofty
cd ~/lofty && cp .env.example .env && nano .env
npm ci --omit=dev
pm2 start src/index.js --name lofty
pm2 save && pm2 startup   # restart on reboot
```

Lofty stores already-posted job IDs in `data/state.json`. Deploys don't touch that file, so jobs never get reposted.

## CI/CD

`.github/workflows/ci.yml` runs on every push and PR:

- **CI**: installs dependencies, syntax-checks the bot and runs the tests (`npm test`).
- **CD**: after the tests pass on `main`, it connects to your server over SSH, runs `git pull`, installs dependencies and restarts the bot with pm2.

Deploy is **off** until you enable it. In the repo, go to Settings → Secrets and variables → Actions and add:

- Secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (a private key whose public key is in the server's `~/.ssh/authorized_keys`), and optionally `SSH_PORT`
- Variable: `DEPLOY_ENABLED` = `true`

The bot token stays in `.env` on the server and never goes to GitHub.

## Tests

```bash
npm test
```
