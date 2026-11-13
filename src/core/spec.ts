/**
 * Job specs: plain, serializable descriptions of a Magic Hour generation.
 *
 * This file is isomorphic (browser + Node). Components build a spec from their
 * props, hash it, and look the hash up in the manifest. The Node runner reads the
 * same spec and calls the Magic Hour API.
 */

/**
 * An input to a job:
 * - a path inside your Remotion `public/` folder, e.g. "host.mp4"
 * - an http(s) URL
 * - another job spec (its output is generated first and fed in)
 */
export type MagicInput = string | JobSpec;

export type Trim = { start?: number; end?: number };

export type LipSyncSpec = {
  kind: "lip-sync";
  video: MagicInput;
  audio: MagicInput;
  mode?: "lite" | "standard" | "pro";
  maxFps?: number;
  trim?: Trim;
};

export type FaceSwapSpec = {
  kind: "face-swap";
  video: MagicInput;
  face: MagicInput;
  trim?: Trim;
};

export type TalkingPhotoSpec = {
  kind: "talking-photo";
  image: MagicInput;
  audio: MagicInput;
  resolution?: "480p" | "720p";
  trim?: Trim;
};

export type VideoUpscaleSpec = {
  kind: "video-upscale";
  video: MagicInput;
  resolution: "720p" | "1080p" | "2k" | "4k";
  trim?: Trim;
};

export type ImageToVideoSpec = {
  kind: "image-to-video";
  image: MagicInput;
  prompt?: string;
  seconds: number;
  model?: string;
  resolution?: "360p" | "480p" | "720p" | "1080p" | "4k";
};

export type VoiceSpec = {
  kind: "voice";
  text: string;
  /** A voice id from GET /v1/voices (including your own cloned voices). */
  voice: string;
  language?: string;
  speed?: number;
};

export type RemoveBackgroundSpec = {
  kind: "remove-background";
  image: MagicInput;
  background?: MagicInput;
};

export type JobSpec = (
  | LipSyncSpec
  | FaceSwapSpec
  | TalkingPhotoSpec
  | VideoUpscaleSpec
  | ImageToVideoSpec
  | VoiceSpec
  | RemoveBackgroundSpec
) & {
  /** Change this to force a fresh generation with otherwise identical props. */
  cacheKey?: string;
};

export type JobKind = JobSpec["kind"];
export type OutputType = "video" | "audio" | "image";

export const OUTPUT_TYPE: Record<JobKind, OutputType> = {
  "lip-sync": "video",
  "face-swap": "video",
  "talking-photo": "video",
  "video-upscale": "video",
  "image-to-video": "video",
  voice: "audio",
  "remove-background": "image",
};

export const OUTPUT_EXT: Record<OutputType, string> = {
  video: "mp4",
  audio: "mp3",
  image: "png",
};

export const LABEL: Record<JobKind, string> = {
  "lip-sync": "lip sync",
  "face-swap": "face swap",
  "talking-photo": "talking photo",
  "video-upscale": "upscale",
  "image-to-video": "image to video",
  voice: "voice",
  "remove-background": "background removal",
};

export const isSpec = (x: unknown): x is JobSpec =>
  typeof x === "object" && x !== null && "kind" in x;

/** Removes undefined values so `{a: 1}` and `{a: 1, b: undefined}` hash the same. */
export const normalizeSpec = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(normalizeSpec) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = normalizeSpec(v);
    }
    return out as T;
  }
  return value;
};

export const stableStringify = (value: unknown): string =>
  JSON.stringify(normalizeSpec(value));

// cyrb53, run twice with different seeds -> ~106 bits. Fast, sync, isomorphic.
const cyrb53 = (str: string, seed: number): string => {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
};

/** Stable id for a spec. Same props -> same hash -> cached output is reused. */
export const hashSpec = (spec: JobSpec): string => {
  const s = stableStringify(spec);
  return `${spec.kind}-${cyrb53(s, 1)}${cyrb53(s, 2)}`;
};

export const outputFileFor = (spec: JobSpec, hash = hashSpec(spec)): string =>
  `${MAGICHOUR_DIR}/out/${hash}.${OUTPUT_EXT[OUTPUT_TYPE[spec.kind]]}`;

/** All paths are relative to the Remotion `public/` folder. */
export const MAGICHOUR_DIR = "magichour";
export const MANIFEST_PATH = `${MAGICHOUR_DIR}/manifest.json`;
export const REQUESTS_DIR = `${MAGICHOUR_DIR}/requests`;
export const COLLECT_PROP = "__magichourCollect";
export const COLLECT_LOG_PREFIX = "[magichour:request]";

export type AssetStatus = "queued" | "running" | "done" | "error";

export type ManifestEntry = {
  status: AssetStatus;
  kind: JobKind;
  file?: string;
  error?: string;
  projectId?: string;
  credits?: number;
  updatedAt: string;
};

export type Manifest = {
  version: 1;
  assets: Record<string, ManifestEntry>;
};

export const emptyManifest = (): Manifest => ({ version: 1, assets: {} });
