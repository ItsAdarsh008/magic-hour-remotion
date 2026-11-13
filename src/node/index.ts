import { existsSync, watch } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { COLLECT_LOG_PREFIX, COLLECT_PROP, REQUESTS_DIR, hashSpec, type JobSpec } from "../core/spec.js";
import { MagicRunner, type RunnerOptions } from "./runner.js";
import { ManifestStore } from "./manifest-store.js";

export { MagicRunner, type RunnerOptions } from "./runner.js";
export { ManifestStore } from "./manifest-store.js";
export { MagicHourBackend, MockBackend, type Backend, type BackendResult } from "./backends.js";
export * from "../core/spec.js";

type Request = { hash: string; spec: JobSpec };

const readRequest = async (file: string): Promise<Request | null> => {
  try {
    const json = JSON.parse(await readFile(file, "utf8")) as Request;
    if (!json?.spec?.kind) return null;
    // Never trust the hash in the file; recompute from the spec.
    return { hash: hashSpec(json.spec), spec: json.spec };
  } catch {
    return null;
  }
};

/** Every request the Studio has written to public/magichour/requests/. */
export const listRequests = async (publicDir: string): Promise<Request[]> => {
  const dir = path.join(publicDir, REQUESTS_DIR);
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const reqs = await Promise.all(files.map((f) => readRequest(path.join(dir, f))));
  return reqs.filter((r): r is Request => r !== null);
};

/**
 * Watches the requests folder the Studio writes to and generates each new request.
 * This is what makes "edit a prop, see the AI result swap in" work.
 */
export const watchRequests = async (runner: MagicRunner, publicDir: string, opts: { retryErrors?: boolean } = {}) => {
  const dir = path.join(publicDir, REQUESTS_DIR);
  await mkdir(dir, { recursive: true });

  const handle = async (file: string, retryErrors = false) => {
    const req = await readRequest(file);
    if (req) await runner.ensure(req.spec, { retryErrors }).catch(() => undefined);
  };

  for (const req of await listRequests(publicDir)) {
    runner.ensure(req.spec, { retryErrors: opts.retryErrors }).catch(() => undefined);
  }

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const watcher = watch(dir, (_event, name) => {
    if (!name || !name.endsWith(".json")) return;
    clearTimeout(timers.get(name));
    // A re-written request (same props saved again after a failure) retries the job.
    timers.set(name, setTimeout(() => handle(path.join(dir, name), true), 150));
  });
  return () => watcher.close();
};

export type CollectOptions = {
  entryPoint: string;
  publicDir: string;
  compositions?: string[];
  inputProps?: Record<string, unknown>;
  everyNthFrame?: number;
  /** Path to Chrome / chrome-headless-shell, if Remotion can't download its own. */
  browserExecutable?: string;
  log?: (msg: string) => void;
};

/**
 * Renders the project at low resolution with components in "collect" mode: instead of
 * drawing, each Magic Hour component logs the job it needs. Returns those jobs.
 * Needs @remotion/bundler and @remotion/renderer (already in every Remotion project).
 */
export const collectJobs = async (opts: CollectOptions): Promise<Request[]> => {
  const log = opts.log ?? ((m) => console.log(m));
  const { bundle } = await import("@remotion/bundler");
  const { getCompositions, renderFrames, selectComposition } = await import("@remotion/renderer");

  await new ManifestStore(opts.publicDir).ensureExists();
  log(`Bundling ${path.relative(process.cwd(), opts.entryPoint)}…`);
  const serveUrl = await bundle({ entryPoint: opts.entryPoint, publicDir: opts.publicDir });
  const inputProps = { ...(opts.inputProps ?? {}), [COLLECT_PROP]: true };
  const browserExecutable = opts.browserExecutable ?? null;

  const comps = opts.compositions?.length
    ? await Promise.all(opts.compositions.map((id) => selectComposition({ serveUrl, id, inputProps, browserExecutable })))
    : await getCompositions(serveUrl, { inputProps, browserExecutable });

  const found = new Map<string, Request>();
  for (const composition of comps) {
    log(`Scanning composition "${composition.id}" (${composition.durationInFrames} frames)…`);
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "magichour-collect-"));
    try {
      await renderFrames({
        composition,
        serveUrl,
        inputProps,
        outputDir,
        imageFormat: "jpeg",
        scale: 0.1,
        browserExecutable,
        everyNthFrame: opts.everyNthFrame ?? 1,
        onStart: () => undefined,
        onFrameUpdate: () => undefined,
        onBrowserLog: (l) => {
          const i = l.text.indexOf(COLLECT_LOG_PREFIX);
          if (i === -1) return;
          try {
            const req = JSON.parse(l.text.slice(i + COLLECT_LOG_PREFIX.length)) as Request;
            const hash = hashSpec(req.spec);
            found.set(hash, { hash, spec: req.spec });
          } catch {
            // ignore malformed lines
          }
        },
      });
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  }
  return [...found.values()];
};

export const createRunner = (opts: RunnerOptions) => new MagicRunner(opts);
