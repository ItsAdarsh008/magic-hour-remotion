import React from "react";
import { Audio, Img, OffthreadVideo } from "remotion";
import {
  isSpec,
  type FaceSwapSpec,
  type ImageToVideoSpec,
  type JobSpec,
  type LipSyncSpec,
  type MagicInput,
  type RemoveBackgroundSpec,
  type TalkingPhotoSpec,
  type Trim,
  type VideoUpscaleSpec,
  type VoiceSpec,
} from "../core/spec.js";
import { MagicPlaceholder } from "./placeholder.js";
import { useMagicAsset } from "./use-magic-asset.js";

type VideoProps = Omit<React.ComponentProps<typeof OffthreadVideo>, "src">;
type AudioProps = Omit<React.ComponentProps<typeof Audio>, "src">;
type ImgProps = Omit<React.ComponentProps<typeof Img>, "src">;

type Common = { cacheKey?: string };

/** Speech can be an audio file, or text + voice (generated with Magic Hour's voice API first). */
type Speech =
  | { audio: MagicInput; text?: never; voice?: never; language?: never }
  | { audio?: never; text: string; voice: string; language?: string };

const speechInput = (p: { audio?: MagicInput; text?: string; voice?: string; language?: string }): MagicInput => {
  if (p.audio !== undefined) return p.audio;
  if (p.text === undefined || p.voice === undefined) {
    throw new Error("[magichour] pass either `audio` or `text` + `voice`");
  }
  const spec: VoiceSpec = { kind: "voice", text: p.text, voice: p.voice, language: p.language };
  return spec;
};

/** Walk nested specs to find a plain file we can show while waiting. */
const previewOf = (input: MagicInput | undefined): string | undefined => {
  if (input === undefined || typeof input === "string") return input;
  const s = input as Record<string, unknown>;
  for (const key of ["video", "image"]) {
    const v = s[key] as MagicInput | undefined;
    if (v !== undefined) return previewOf(v);
  }
  return undefined;
};

const MagicVideoOutput: React.FC<{ spec: JobSpec; preview?: MagicInput; previewType: "video" | "image"; mediaProps: VideoProps }> = ({
  spec,
  preview,
  previewType,
  mediaProps,
}) => {
  const state = useMagicAsset(spec);
  if (state.status === "done" && state.src) {
    return <OffthreadVideo {...mediaProps} src={state.src} />;
  }
  if (state.status === "collect") return null;
  return (
    <MagicPlaceholder
      kind={spec.kind}
      state={state}
      source={previewOf(preview)}
      sourceType={previewType}
      style={mediaProps.style}
    />
  );
};

const pick = <T extends object, K extends string>(props: T, keys: readonly K[]) => {
  const spec: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if ((keys as readonly string[]).includes(k)) spec[k] = v;
    else rest[k] = v;
  }
  return { spec, rest };
};

// ---------------------------------------------------------------------------

export type MagicLipSyncProps = Common &
  Speech & { video: MagicInput; mode?: LipSyncSpec["mode"]; maxFps?: number; trim?: Trim } & VideoProps;

/**
 * Re-animates the mouth in `video` to match `audio` (or `text` spoken by `voice`).
 *
 * @example <MagicLipSync video="host.mp4" text="Ship it today." voice="my-voice-id" />
 */
export const MagicLipSync: React.FC<MagicLipSyncProps> = (props) => {
  const { spec, rest } = pick(props, ["video", "audio", "text", "voice", "language", "mode", "maxFps", "trim", "cacheKey"] as const);
  const job: JobSpec = {
    kind: "lip-sync",
    video: spec.video as MagicInput,
    audio: speechInput(spec),
    mode: spec.mode as LipSyncSpec["mode"],
    maxFps: spec.maxFps as number | undefined,
    trim: spec.trim as Trim | undefined,
    cacheKey: spec.cacheKey as string | undefined,
  };
  return <MagicVideoOutput spec={job} preview={job.video} previewType="video" mediaProps={rest as VideoProps} />;
};

export type MagicFaceSwapProps = Common & { video: MagicInput; face: MagicInput; trim?: Trim } & VideoProps;

/** Swaps every face in `video` with the face in the `face` image. */
export const MagicFaceSwap: React.FC<MagicFaceSwapProps> = (props) => {
  const { spec, rest } = pick(props, ["video", "face", "trim", "cacheKey"] as const);
  const job = { kind: "face-swap", ...spec } as FaceSwapSpec;
  return <MagicVideoOutput spec={job} preview={job.video} previewType="video" mediaProps={rest as VideoProps} />;
};

export type MagicTalkingPhotoProps = Common &
  Speech & { image: MagicInput; resolution?: TalkingPhotoSpec["resolution"]; trim?: Trim } & VideoProps;

/** Makes a still photo talk. Great for founders' headshots, historical figures in explainers, mascots. */
export const MagicTalkingPhoto: React.FC<MagicTalkingPhotoProps> = (props) => {
  const { spec, rest } = pick(props, ["image", "audio", "text", "voice", "language", "resolution", "trim", "cacheKey"] as const);
  const job: JobSpec = {
    kind: "talking-photo",
    image: spec.image as MagicInput,
    audio: speechInput(spec),
    resolution: spec.resolution as TalkingPhotoSpec["resolution"],
    trim: spec.trim as Trim | undefined,
    cacheKey: spec.cacheKey as string | undefined,
  };
  return <MagicVideoOutput spec={job} preview={job.image} previewType="image" mediaProps={rest as VideoProps} />;
};

export type MagicUpscaleProps = Common & { video: MagicInput; resolution: VideoUpscaleSpec["resolution"]; trim?: Trim } & VideoProps;

/** Upscales low-res footage (old screen recordings, phone clips) before it goes into your edit. */
export const MagicUpscale: React.FC<MagicUpscaleProps> = (props) => {
  const { spec, rest } = pick(props, ["video", "resolution", "trim", "cacheKey"] as const);
  const job = { kind: "video-upscale", ...spec } as VideoUpscaleSpec;
  return <MagicVideoOutput spec={job} preview={job.video} previewType="video" mediaProps={rest as VideoProps} />;
};

export type MagicImageToVideoProps = Common &
  { image: MagicInput; prompt?: string; seconds: number; model?: string; resolution?: ImageToVideoSpec["resolution"] } & VideoProps;

/** Animates a still (product shot, screenshot, illustration) into a short clip. */
export const MagicImageToVideo: React.FC<MagicImageToVideoProps> = (props) => {
  const { spec, rest } = pick(props, ["image", "prompt", "seconds", "model", "resolution", "cacheKey"] as const);
  const job = { kind: "image-to-video", ...spec } as ImageToVideoSpec;
  return <MagicVideoOutput spec={job} preview={job.image} previewType="image" mediaProps={rest as VideoProps} />;
};

export type MagicVoiceProps = Common & { text: string; voice: string; language?: string; speed?: number } & AudioProps;

/** Text-to-speech as an <Audio>. Silent until generated; no badge (it's audio). */
export const MagicVoice: React.FC<MagicVoiceProps> = (props) => {
  const { spec, rest } = pick(props, ["text", "voice", "language", "speed", "cacheKey"] as const);
  const job = { kind: "voice", ...spec } as VoiceSpec;
  const state = useMagicAsset(job);
  if (state.status === "done" && state.src) return <Audio {...(rest as AudioProps)} src={state.src} />;
  return null;
};

export type MagicRemoveBackgroundProps = Common & { image: MagicInput; background?: MagicInput } & ImgProps;

/** Cut-out of `image` (optionally composited onto `background`) as an <Img>. */
export const MagicRemoveBackground: React.FC<MagicRemoveBackgroundProps> = (props) => {
  const { spec, rest } = pick(props, ["image", "background", "cacheKey"] as const);
  const job = { kind: "remove-background", ...spec } as RemoveBackgroundSpec;
  const state = useMagicAsset(job);
  if (state.status === "done" && state.src) return <Img {...(rest as ImgProps)} src={state.src} />;
  if (state.status === "collect") return null;
  return (
    <MagicPlaceholder
      kind={job.kind}
      state={state}
      source={previewOf(job.image)}
      sourceType="image"
      style={(rest as ImgProps).style}
    />
  );
};

export { isSpec };
