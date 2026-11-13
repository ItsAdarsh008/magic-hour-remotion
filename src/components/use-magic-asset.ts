import { useEffect, useMemo, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  getInputProps,
  getRemotionEnvironment,
  staticFile,
} from "remotion";
import {
  COLLECT_LOG_PREFIX,
  COLLECT_PROP,
  LABEL,
  MANIFEST_PATH,
  REQUESTS_DIR,
  emptyManifest,
  hashSpec,
  normalizeSpec,
  stableStringify,
  type AssetStatus,
  type JobSpec,
  type Manifest,
} from "../core/spec.js";

export type MagicAssetState = {
  hash: string;
  /** "missing" = not requested yet (Player / web), "collect" = prefetch is scanning. */
  status: AssetStatus | "missing" | "collect";
  /** URL of the generated file, once status is "done". */
  src?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Manifest store (one per page, shared by every component)
// ---------------------------------------------------------------------------

let manifest: Manifest | null = null;
let inflight: Promise<Manifest> | null = null;
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

const fetchManifest = async (): Promise<Manifest> => {
  try {
    const res = await fetch(`${staticFile(MANIFEST_PATH)}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return emptyManifest();
    const json = (await res.json()) as Manifest;
    return json?.assets ? json : emptyManifest();
  } catch {
    return emptyManifest();
  }
};

const loadManifest = (): Promise<Manifest> => {
  if (manifest) return Promise.resolve(manifest);
  if (!inflight) {
    inflight = fetchManifest().then((m) => {
      manifest = m;
      inflight = null;
      return m;
    });
  }
  return inflight;
};

const refresh = async () => {
  const next = await fetchManifest();
  if (JSON.stringify(next) !== JSON.stringify(manifest)) {
    manifest = next;
    listeners.forEach((l) => l());
  }
};

/** In the Studio, poll the manifest while components are mounted so results swap in live. */
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!pollTimer && getRemotionEnvironment().isStudio) {
    pollTimer = setInterval(refresh, 1500);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
};

// ---------------------------------------------------------------------------
// Requests: the Studio writes public/magichour/requests/<hash>.json and the
// `magichour-remotion dev` watcher picks it up.
// ---------------------------------------------------------------------------

const requested = new Set<string>();

/** Same call @remotion/studio's writeStaticFile() makes, without importing the package. */
const writeStudioFile = async (filePath: string, contents: string) => {
  const w = (typeof window === "undefined" ? undefined : window) as
    | (Window & { remotion_staticBase?: string; remotion_isReadOnlyStudio?: boolean })
    | undefined;
  if (!w || w.remotion_isReadOnlyStudio) return;
  const url = new URL(`${w.remotion_staticBase ?? ""}/api/add-asset`, w.location.origin);
  url.search = new URLSearchParams({ filePath }).toString();
  const res = await fetch(url, { method: "POST", body: contents });
  if (!res.ok) throw new Error(`Could not write ${filePath}`);
};

const requestAsset = (hash: string, spec: JobSpec) => {
  if (requested.has(hash)) return;
  requested.add(hash);
  writeStudioFile(
    `${REQUESTS_DIR}/${hash}.json`,
    JSON.stringify({ hash, spec: normalizeSpec(spec), requestedAt: new Date().toISOString() }, null, 2),
  ).catch((err) => {
    requested.delete(hash);
    console.warn("[magichour] could not queue request", err);
  });
};

const collected = new Set<string>();

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useMagicAsset = (spec: JobSpec): MagicAssetState => {
  const key = stableStringify(spec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hash = useMemo(() => hashSpec(spec), [key]);
  const env = getRemotionEnvironment();

  const [, force] = useState(0);
  const [handle] = useState(() =>
    !manifest && env.isRendering ? delayRender("Loading Magic Hour manifest") : null,
  );

  useEffect(() => {
    let alive = true;
    loadManifest().then(() => {
      if (!alive) return;
      force((n) => n + 1);
      if (handle !== null) continueRender(handle);
    });
    const unsub = subscribe(() => alive && force((n) => n + 1));
    return () => {
      alive = false;
      unsub();
    };
  }, [handle]);

  const entry = manifest?.assets[hash];

  const collecting =
    env.isRendering && Boolean((getInputProps() as Record<string, unknown>)[COLLECT_PROP]);

  let state: MagicAssetState;
  if (collecting) {
    // prefetch is scanning: report every asset (cached or not) and draw nothing.
    state = { hash, status: "collect" };
  } else if (!manifest) {
    state = { hash, status: "queued" };
  } else if (entry?.status === "done" && entry.file) {
    state = { hash, status: "done", src: staticFile(entry.file) };
  } else if (env.isStudio) {
    state = { hash, status: entry?.status ?? "queued", error: entry?.error };
  } else if (env.isRendering) {
    state = { hash, status: "collect" };
  } else {
    state = { hash, status: entry?.status ?? "missing", error: entry?.error };
  }

  // Side effects for missing assets.
  useEffect(() => {
    if (collecting) {
      if (!collected.has(hash)) {
        collected.add(hash);
        console.log(`${COLLECT_LOG_PREFIX}${JSON.stringify({ hash, spec: normalizeSpec(spec) })}`);
      }
      return;
    }
    if (!manifest || state.status === "done") return;
    if (env.isStudio && state.status !== "error") {
      requestAsset(hash, spec);
      return;
    }
    if (env.isRendering) {
      cancelRender(
        new Error(
          `Magic Hour ${LABEL[spec.kind]} (${hash}) has not been generated yet. ` +
            `Run \`npx magichour-remotion prefetch\` before rendering, or open the Studio ` +
            `with \`npx magichour-remotion dev\` running.`,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, state.status, manifest !== null, collecting]);

  return state;
};
