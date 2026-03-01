# Daro Parser Worker

This Cloudflare Worker scrapes archived records from the Rivne region site and updates a GitHub file.

## Invocation

The worker runs in three ways:

1. **Scheduled (cron) trigger** – configured via `wrangler.toml` (e.g. `cron = "0 6 * * *"`). When the scheduler fires, the `scheduled` handler calls `handleSchedule`.

2. **HTTP request** – the worker exports a `fetch` handler that simply invokes the same `handleSchedule` logic and returns `200 OK`. You can call the worker's URL right after deployment (or at any time) to force a run. Example:

```sh
curl https://<your-worker-subdomain>.workers.dev/
```

3. **Manual in development** – when using `wrangler dev`, visiting the local URL also triggers the scraping logic via the fetch handler.

> ⚠️ There is no special "on deploy" event available in Workers; the HTTP trigger is the recommended way to run immediately after publishing.

## Environment

The worker requires GitHub credentials via environment variables:

- `GITHUB_REPO` (owner/repo)
- `GITHUB_TOKEN` (Personal Access Token)
- `GITHUB_BRANCH` (branch for updates)

These can be configured in `wrangler.toml` under `[env.production]` or via Wrangler's `secret` commands.

## Testing

Run unit tests with:

```sh
cd workers/daro-parser
npm test
```

Integration tests are skipped by default and are not included in this repository.
