import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { LABEL } from "../core/spec.js";
import { collectJobs, listRequests, watchRequests } from "./index.js";
import { ManifestStore } from "./manifest-store.js";
import { MagicRunner } from "./runner.js";

const HELP = `magichour-remotion — Magic Hour AI inside Remotion

Usage
  magichour-remotion dev        Watch the Studio and generate assets as you edit
  magichour-remotion prefetch   Generate every asset your compositions need (run before rendering)
  magichour-remotion status     Show what's generated, running or failed
  magichour-remotion voices     List voice ids you can pass as voice="…"

Options
  --public <dir>          Remotion public folder (default: ./public)
  --entry <file>          Remotion entry point for prefetch (default: src/index.ts)
  --composition <id>      Only scan this composition (repeatable)
  --props <json|file>     Input props to scan with (for data-driven templates)
  --every-nth-frame <n>   Scan faster by sampling frames (default: 1)
  --browser <path>        Chrome to scan with, if Remotion can't download one
  --from-requests         prefetch: generate what the Studio requested instead of scanning
  --retry                 Retry assets that failed before
  --concurrency <n>       Parallel Magic Hour jobs (default: 3)
  --mock                  Don't call the API; fake results with ffmpeg (free)

Env
  MAGIC_HOUR_API_KEY      Your key from https://magichour.ai/developer (a .env file works)
`;

const main = async () => {
  if (existsSync(".env")) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // ignore
    }
  }

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      public: { type: "string", default: "public" },
      entry: { type: "string" },
      composition: { type: "string", multiple: true },
      props: { type: "string" },
      "every-nth-frame": { type: "string" },
      "from-requests": { type: "boolean", default: false },
      browser: { type: "string" },
      retry: { type: "boolean", default: false },
      concurrency: { type: "string" },
      mock: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const command = positionals[0];
  if (!command || values.help) {
    console.log(HELP);
    return;
  }

  const publicDir = path.resolve(values.public!);
  const makeRunner = () =>
    new MagicRunner({
      publicDir,
      mock: values.mock || undefined,
      concurrency: values.concurrency ? Number(values.concurrency) : undefined,
    });

  if (command === "status") {
    const m = await new ManifestStore(publicDir).read();
    const entries = Object.entries(m.assets);
    if (!entries.length) return console.log("No Magic Hour assets yet.");
    let credits = 0;
    for (const [hash, e] of entries) {
      credits += e.credits ?? 0;
      const icon = { done: "✓", running: "…", queued: "·", error: "✗" }[e.status];
      console.log(`${icon} ${LABEL[e.kind].padEnd(18)} ${hash}${e.error ? `  ${e.error}` : ""}`);
    }
    console.log(`\n${entries.length} assets, ${credits} credits spent`);
    return;
  }

  if (command === "voices") {
    const apiKey = process.env.MAGIC_HOUR_API_KEY;
    if (!apiKey) throw new Error("Set MAGIC_HOUR_API_KEY to list voices.");
    const { Client } = await import("magic-hour");
    const client: any = new Client({ token: apiKey });
    let cursor: string | undefined;
    do {
      const page = await client.v1.voices.list(cursor ? { cursor } : {});
      for (const v of page.voices) console.log(`${v.id.padEnd(14)} ${v.name}`);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return;
  }

  if (command === "dev") {
    const runner = makeRunner();
    console.log(`✦ Magic Hour dev watcher (${runner.backend.label})`);
    console.log(`  Watching public/magichour/requests — open Remotion Studio in another terminal (npx remotion studio).`);
    await watchRequests(runner, publicDir, { retryErrors: true });
    await new Promise(() => undefined);
    return;
  }

  if (command === "prefetch") {
    const runner = makeRunner();
    let jobs;
    if (values["from-requests"]) {
      jobs = await listRequests(publicDir);
      console.log(`Found ${jobs.length} request(s) from the Studio.`);
    } else {
      const entry = path.resolve(
        values.entry ?? ["src/index.ts", "src/index.tsx", "src/index.js"].find((f) => existsSync(f)) ?? "src/index.ts",
      );
      let inputProps: Record<string, unknown> | undefined;
      if (values.props) {
        const { readFile } = await import("node:fs/promises");
        inputProps = JSON.parse(existsSync(values.props) ? await readFile(values.props, "utf8") : values.props);
      }
      jobs = await collectJobs({
        entryPoint: entry,
        publicDir,
        compositions: values.composition,
        inputProps,
        everyNthFrame: values["every-nth-frame"] ? Number(values["every-nth-frame"]) : undefined,
        browserExecutable: values.browser ?? process.env.REMOTION_BROWSER_EXECUTABLE,
      });
      console.log(`Found ${jobs.length} Magic Hour asset(s) in your compositions.`);
    }

    const store = new ManifestStore(publicDir);
    const before = await store.read();
    const cached = jobs.filter((j) => before.assets[j.hash]?.status === "done").length;
    if (cached) console.log(`${cached} already generated (cached), ${jobs.length - cached} to generate.`);
    const results = await Promise.allSettled(jobs.map((j) => runner.ensure(j.spec, { retryErrors: values.retry })));
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log(failed ? `\n${failed} of ${jobs.length} failed. Fix the errors above, then run again with --retry.` : `\nAll ${jobs.length} ready. You can render now.`);
    process.exitCode = failed ? 1 : 0;
    return;
  }

  console.log(HELP);
  process.exitCode = 1;
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
