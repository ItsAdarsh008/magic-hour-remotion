import { existsSync } from "node:fs";
import { copyFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { LABEL, hashSpec, isSpec, normalizeSpec, outputFileFor, type JobSpec, type MagicInput } from "../core/spec.js";
import { MagicHourBackend, MockBackend, type Backend, type ResolvedSpec } from "./backends.js";
import { ManifestStore } from "./manifest-store.js";

export type RunnerOptions = {
  /** Your Remotion project's public/ folder. */
  publicDir: string;
  /** Defaults to process.env.MAGIC_HOUR_API_KEY. */
  apiKey?: string;
  /** Use the free ffmpeg mock instead of the API. Defaults to MAGICHOUR_MOCK=1. */
  mock?: boolean;
  /** Max Magic Hour jobs running at once. */
  concurrency?: number;
  log?: (msg: string) => void;
  backend?: Backend;
};

const limiter = (max: number) => {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>((r) => waiting.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
};

const describe = (spec: JobSpec) => {
  const s = spec as Record<string, unknown>;
  const bits = ["video", "image", "audio", "face"]
    .map((k) => s[k])
    .filter((v): v is string => typeof v === "string")
    .map((v) => path.basename(v));
  if (spec.kind === "voice") bits.push(`"${spec.text.slice(0, 40)}${spec.text.length > 40 ? "…" : ""}"`);
  return `${LABEL[spec.kind]}${bits.length ? ` (${bits.join(", ")})` : ""}`;
};

/**
 * Generates Magic Hour assets for job specs and records them in the manifest.
 * Nested specs (e.g. lip sync whose audio is a generated voice) are generated first.
 * Identical specs are only ever generated once.
 */
export class MagicRunner {
  readonly store: ManifestStore;
  readonly backend: Backend;
  private inflight = new Map<string, Promise<string>>();
  private limit: ReturnType<typeof limiter>;
  private log: (msg: string) => void;

  constructor(private opts: RunnerOptions) {
    this.store = new ManifestStore(opts.publicDir);
    this.log = opts.log ?? ((m) => console.log(m));
    this.limit = limiter(opts.concurrency ?? 3);
    const mock = opts.mock ?? process.env.MAGICHOUR_MOCK === "1";
    const apiKey = opts.apiKey ?? process.env.MAGIC_HOUR_API_KEY;
    if (opts.backend) this.backend = opts.backend;
    else if (mock) this.backend = new MockBackend();
    else if (apiKey) this.backend = new MagicHourBackend(apiKey);
    else
      throw new Error(
        "No Magic Hour API key. Set MAGIC_HOUR_API_KEY (get one at https://magichour.ai/developer), or use --mock to try it for free.",
      );
  }

  /** Returns the output path relative to public/, generating it if needed. */
  ensure(spec: JobSpec, opts: { retryErrors?: boolean } = {}): Promise<string> {
    const clean = normalizeSpec(spec);
    const hash = hashSpec(clean);
    const existing = this.inflight.get(hash);
    if (existing) return existing;
    const p = this.generate(hash, clean, opts).finally(() => this.inflight.delete(hash));
    this.inflight.set(hash, p);
    return p;
  }

  private async generate(hash: string, spec: JobSpec, opts: { retryErrors?: boolean }): Promise<string> {
    const entry = await this.store.get(hash);
    if (entry?.status === "done" && entry.file && existsSync(path.join(this.opts.publicDir, entry.file))) {
      return entry.file;
    }
    if (entry?.status === "error" && !opts.retryErrors) {
      throw new Error(entry.error ?? "previous attempt failed");
    }

    await this.store.update(hash, { kind: spec.kind, status: "queued" });
    try {
      // Resolve inputs first (outside the concurrency slot, so nested jobs can't deadlock).
      const resolved = await this.resolveInputs(spec, opts);
      const file = await this.limit(async () => {
        await this.store.update(hash, { kind: spec.kind, status: "running" });
        this.log(`✦ ${describe(spec)} → ${this.backend.label}`);
        const started = Date.now();
        const result = await this.backend.run({ ...resolved, name: `remotion ${hash}` } as ResolvedSpec);
        const rel = outputFileFor(spec, hash);
        const abs = path.join(this.opts.publicDir, rel);
        await mkdir(path.dirname(abs), { recursive: true });
        await rename(result.file, abs).catch(() => copyFile(result.file, abs));
        await this.store.update(hash, {
          kind: spec.kind,
          status: "done",
          file: rel,
          projectId: result.projectId,
          credits: result.credits,
        });
        const secs = ((Date.now() - started) / 1000).toFixed(1);
        const credits = result.credits ? `, ${result.credits} credits` : "";
        this.log(`  ✓ ${describe(spec)} in ${secs}s${credits} → public/${rel}`);
        return rel;
      });
      return file;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.store.update(hash, { kind: spec.kind, status: "error", error: message });
      this.log(`  ✗ ${describe(spec)}: ${message}`);
      throw err;
    }
  }

  private async resolveInput(input: MagicInput, opts: { retryErrors?: boolean }): Promise<string> {
    if (isSpec(input)) return path.join(this.opts.publicDir, await this.ensure(input, opts));
    if (/^https?:\/\//.test(input)) return input;
    const abs = path.join(this.opts.publicDir, input.replace(/^\/+/, ""));
    if (!existsSync(abs)) throw new Error(`Input not found: public/${input}`);
    return abs;
  }

  private async resolveInputs(spec: JobSpec, opts: { retryErrors?: boolean }): Promise<JobSpec> {
    const out: Record<string, unknown> = { ...spec };
    const keys = ["video", "audio", "image", "face", "background"] as const;
    await Promise.all(
      keys.map(async (k) => {
        const v = (spec as Record<string, unknown>)[k] as MagicInput | undefined;
        if (v !== undefined) out[k] = await this.resolveInput(v, opts);
      }),
    );
    return out as JobSpec;
  }
}
