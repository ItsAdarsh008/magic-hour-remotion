import { copyFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { OUTPUT_EXT, OUTPUT_TYPE, type JobSpec } from "../core/spec.js";
import { ffmpeg, getDimensions, getDuration, hasBinary } from "./media.js";

/** A spec whose inputs have been replaced by local file paths or URLs. */
export type ResolvedSpec = JobSpec & { name: string };

export type BackendResult = { file: string; projectId?: string; credits?: number };

export interface Backend {
  readonly label: string;
  run(spec: ResolvedSpec): Promise<BackendResult>;
}

const tmpDir = () => mkdtemp(path.join(os.tmpdir(), "magichour-"));

/** Works out start/end seconds the way Magic Hour's video endpoints want them. */
const window = async (spec: { trim?: { start?: number; end?: number } }, lengthOf: string, clampTo?: string) => {
  const start = spec.trim?.start ?? 0;
  let end = spec.trim?.end ?? start + (await getDuration(lengthOf));
  if (clampTo && clampTo !== lengthOf) {
    const max = await getDuration(clampTo).catch(() => Infinity);
    end = Math.min(end, max);
  }
  return { startSeconds: start, endSeconds: Math.round(end * 100) / 100 };
};

/** Extracts up to 45s of mono audio from a clip to use as the voice-cloning sample. */
const voiceSample = async (input: string, dir: string): Promise<string> => {
  if (!(await hasBinary("ffmpeg"))) {
    if (/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(input)) return input;
    throw new Error("Cloning a voice from a video needs ffmpeg on PATH (or pass an audio file as cloneVoiceFrom)");
  }
  const out = path.join(dir, "voice-sample.mp3");
  await ffmpeg(["-i", input, "-vn", "-ac", "1", "-t", "45", "-b:a", "128k", out]);
  return out;
};

// ---------------------------------------------------------------------------
// Real backend: the official magic-hour Node SDK
// ---------------------------------------------------------------------------

export class MagicHourBackend implements Backend {
  readonly label = "Magic Hour API";
  private client: any;

  constructor(private apiKey: string) {}

  private async sdk() {
    if (!this.client) {
      const { Client } = await import("magic-hour");
      this.client = new Client({ token: this.apiKey });
    }
    return this.client;
  }

  async run(spec: ResolvedSpec): Promise<BackendResult> {
    try {
      return await this.runInner(spec);
    } catch (err: any) {
      // Surface Magic Hour's own validation message instead of a bare "422 was returned".
      let detail: string | undefined;
      try {
        const body = err?.response?.text ? JSON.parse(await err.response.text()) : undefined;
        detail = body?.message;
      } catch {
        // ignore
      }
      if (detail) throw new Error(`Magic Hour rejected the ${spec.kind} request: ${detail}`);
      throw err;
    }
  }

  private async runInner(spec: ResolvedSpec): Promise<BackendResult> {
    const v1 = (await this.sdk()).v1;
    const downloadDirectory = await tmpDir();
    const opts = { waitForCompletion: true, downloadOutputs: true, downloadDirectory };
    const name = spec.name;
    let res: any;

    switch (spec.kind) {
      case "lip-sync": {
        const audio = spec.audio as string;
        const video = spec.video as string;
        res = await v1.lipSync.generate(
          {
            name,
            assets: { videoSource: "file", videoFilePath: video, audioFilePath: audio },
            ...(await window(spec, audio, video)),
            maxFpsLimit: spec.maxFps,
            style: spec.mode ? { generationMode: spec.mode } : undefined,
          },
          opts,
        );
        break;
      }
      case "face-swap": {
        const video = spec.video as string;
        res = await v1.faceSwap.generate(
          {
            name,
            assets: { videoSource: "file", videoFilePath: video, imageFilePath: spec.face as string, faceSwapMode: "all-faces" },
            ...(await window(spec, video)),
          },
          opts,
        );
        break;
      }
      case "talking-photo": {
        const audio = spec.audio as string;
        res = await v1.aiTalkingPhoto.generate(
          {
            name,
            assets: { imageFilePath: spec.image as string, audioFilePath: audio },
            ...(await window(spec, audio)),
            resolution: spec.resolution,
          },
          opts,
        );
        break;
      }
      case "video-upscale": {
        const video = spec.video as string;
        res = await v1.aiVideoUpscaler.generate(
          { name, assets: { videoFilePath: video }, resolution: spec.resolution, ...(await window(spec, video)) },
          opts,
        );
        break;
      }
      case "image-to-video": {
        res = await v1.imageToVideo.generate(
          {
            name,
            assets: { imageFilePath: spec.image as string },
            endSeconds: spec.seconds,
            model: spec.model,
            resolution: spec.resolution,
            style: spec.prompt ? { prompt: spec.prompt } : undefined,
          },
          opts,
        );
        break;
      }
      case "voice": {
        if (spec.cloneFrom) {
          // Same approach as Retake: sample up to 45s of the speaker, then speak the new text in that voice.
          const sample = await voiceSample(spec.cloneFrom as string, downloadDirectory);
          res = await v1.aiVoiceCloner.generate(
            {
              name,
              assets: { audioFilePath: sample },
              style: { prompt: spec.text.slice(0, 1000), language: spec.language, speed: spec.speed },
            },
            opts,
          );
        } else {
          res = await v1.aiVoiceGenerator.generate(
            { name, style: { prompt: spec.text, voiceName: spec.voice, language: spec.language, speed: spec.speed } },
            opts,
          );
        }
        break;
      }
      case "restyle": {
        let video = spec.video as string;
        let trimSpec: { trim?: { start?: number; end?: number } } = spec;
        // Cut the requested section locally and send only that (fewer bytes to upload,
        // and avoids offset handling on Magic Hour's side).
        if (spec.trim?.start && (await hasBinary("ffmpeg")) && !/^https?:/.test(video)) {
          const cut = path.join(downloadDirectory, "restyle-input.mp4");
          const t = ["-ss", String(spec.trim.start), ...(spec.trim.end ? ["-to", String(spec.trim.end)] : [])];
          await ffmpeg(["-i", video, ...t, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "16", cut]);
          video = cut;
          trimSpec = {};
        }
        const dims = await getDimensions(video);
        const base = {
          name,
          assets: {
            videoSource: "file",
            videoFilePath: video,
            initialImagePath: spec.referenceImage as string | undefined,
          },
          ...(await window(trimSpec, video)),
          fps: Math.round(dims.fps),
          width: dims.width,
          height: dims.height,
          fpsResolution: spec.halfFps ? "HALF" : "FULL",
        };
        void trimSpec;
        // Not every art style supports every model version. Magic Hour's default (v3) needs a
        // reference image, so without one try the most consistent version first and fall back.
        const versions = spec.version ? [spec.version] : spec.referenceImage ? ["v3"] : ["v2", "v1"];
        for (const [i, version] of versions.entries()) {
          try {
            res = await v1.videoToVideo.generate(
              {
                ...base,
                style: {
                  artStyle: spec.artStyle,
                  model: spec.model,
                  version,
                  prompt: spec.prompt,
                  promptType: spec.prompt ? "append_default" : undefined,
                },
              },
              opts,
            );
            break;
          } catch (err: any) {
            const text = err?.response?.text ? await err.response.clone?.().text?.().catch(() => "") ?? "" : "";
            const unavailable = /unavailable for art style/i.test(text) || /unavailable for art style/i.test(String(err?.message));
            if (!unavailable || i === versions.length - 1) throw err;
          }
        }
        break;
      }
      case "render":
        throw new Error("render jobs run locally, not through the API");
      case "remove-background": {
        res = await v1.imageBackgroundRemover.generate(
          {
            name,
            assets: { imageFilePath: spec.image as string, backgroundImageFilePath: spec.background as string | undefined },
          },
          opts,
        );
        break;
      }
    }

    if (!res || res.status !== "complete") {
      const msg = res?.error?.message ?? `status: ${res?.status ?? "unknown"}`;
      throw new Error(`Magic Hour ${spec.kind} failed (${msg})${res?.id ? ` — project ${res.id}` : ""}`);
    }
    const file = res.downloadedPaths?.[0];
    if (!file) {
      throw new Error(
        `Magic Hour finished project ${res.id} but the file did not download` +
          (res.downloadErrors?.length ? ` (${res.downloadErrors[0]?.error ?? "unknown error"})` : "") +
          `. The result is in your Magic Hour library; nothing needs to be regenerated.`,
      );
    }
    return { file, projectId: res.id, credits: res.creditsCharged ?? res.credits_charged };
  }
}

/** Cheap ffmpeg looks so each mock style is visibly different. Not what Magic Hour produces. */
const mockStyleFilter = (style: string): string => {
  const s = style.toLowerCase();
  if (s.includes("chalk")) return "edgedetect=low=0.1:high=0.3,negate,colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,negate,eq=brightness=0.05";
  if (s.includes("clay")) return "boxblur=3:1,eq=saturation=1.8:contrast=1.15,unsharp=5:5:1.5";
  if (s.includes("paper") || s.includes("origami")) return "eq=saturation=1.5:contrast=1.35,unsharp=7:7:2";
  if (s.includes("yarn") || s.includes("fabric")) return "noise=alls=25:allf=t,boxblur=1:1,eq=saturation=1.4";
  if (s.includes("water")) return "gblur=sigma=2,eq=saturation=0.8:brightness=0.06";
  if (s.includes("pixel")) return "scale=iw/12:ih/12,scale=iw*12:ih*12:flags=neighbor";
  return "hue=h=40:s=1.3";
};

// ---------------------------------------------------------------------------
// Mock backend: free, offline, uses ffmpeg. For building templates, CI and demos.
// ---------------------------------------------------------------------------

export class MockBackend implements Backend {
  readonly label = "mock (no API calls)";

  async run(spec: ResolvedSpec): Promise<BackendResult> {
    const dir = await tmpDir();
    const out = path.join(dir, `out.${OUTPUT_EXT[OUTPUT_TYPE[spec.kind]]}`);
    const haveFfmpeg = await hasBinary("ffmpeg");
    const enc = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast"];
    // Simulate API latency so the Studio's "generating…" state is visible.
    await new Promise((r) => setTimeout(r, Number(process.env.MAGICHOUR_MOCK_DELAY_MS ?? 1500)));

    switch (spec.kind) {
      case "lip-sync":
      case "talking-photo": {
        const audio = spec.audio as string;
        const visual = (spec.kind === "lip-sync" ? spec.video : spec.image) as string;
        const { startSeconds, endSeconds } = await window(spec, audio);
        const len = String(endSeconds - startSeconds);
        if (!haveFfmpeg) throw new Error("Mock mode needs ffmpeg on PATH");
        const visualIn = spec.kind === "talking-photo" ? ["-loop", "1", "-i", visual] : ["-stream_loop", "-1", "-i", visual];
        await ffmpeg([...visualIn, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-t", len, ...enc, "-c:a", "aac", "-shortest", out]);
        break;
      }
      case "face-swap":
      case "video-upscale": {
        await copyFile(spec.video as string, out);
        break;
      }
      case "image-to-video": {
        if (!haveFfmpeg) throw new Error("Mock mode needs ffmpeg on PATH");
        const frames = Math.round(spec.seconds * 30);
        await ffmpeg([
          "-loop", "1", "-i", spec.image as string,
          "-vf", `scale=1920:-2,zoompan=z='min(zoom+0.0015,1.3)':d=${frames}:s=1920x1080:fps=30`,
          "-t", String(spec.seconds), ...enc, out,
        ]);
        break;
      }
      case "voice": {
        if (!haveFfmpeg) throw new Error("Mock mode needs ffmpeg on PATH");
        // ~2.6 words/second, a soft tone so you can hear timing.
        const seconds = Math.max(1, spec.text.trim().split(/\s+/).length / 2.6);
        await ffmpeg(["-f", "lavfi", "-i", `sine=frequency=220:duration=${seconds.toFixed(2)}`, "-af", "volume=0.15", out]);
        break;
      }
      case "remove-background": {
        await copyFile(spec.image as string, out);
        break;
      }
      case "restyle": {
        if (!haveFfmpeg) throw new Error("Mock mode needs ffmpeg on PATH");
        const t = spec.trim ? ["-ss", String(spec.trim.start ?? 0), ...(spec.trim.end ? ["-to", String(spec.trim.end)] : [])] : [];
        await ffmpeg([...t, "-i", spec.video as string, "-vf", mockStyleFilter(spec.artStyle), "-an", ...enc, out]);
        break;
      }
      case "render":
        throw new Error("render jobs run locally");
    }
    return { file: out, projectId: "mock", credits: 0 };
  }
}
