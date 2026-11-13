---
name: magic-hour-remotion
description: Use when building Remotion videos that need AI lip sync, talking photos, face swap, video upscaling, image-to-video, text-to-speech or background removal. Adds Magic Hour components from the magic-hour-remotion package.
---

# Magic Hour in Remotion

`magic-hour-remotion` gives Remotion compositions drop-in components backed by the Magic Hour API.
Results are generated once, cached in `public/magichour/`, and reused on every render.

## Setup (once per project)

```bash
npm i magic-hour-remotion
echo "MAGIC_HOUR_API_KEY=..." >> .env      # https://magichour.ai/developer
```

Add `public/magichour/` to `.gitignore` unless the team wants to share generated files.

## Components

Import from `"magic-hour-remotion"`. File inputs are paths inside `public/` (e.g. `"host.mp4"`) or https URLs.
Video components accept every `<OffthreadVideo>` prop (`style`, `volume`, `muted`, ...).

| Component | Required props | Use for |
|---|---|---|
| `<MagicLipSync>` | `video` + (`audio` or `text` + `voice`) | Change what someone on camera says |
| `<MagicTalkingPhoto>` | `image` + (`audio` or `text` + `voice`) | Make a headshot / illustration speak |
| `<MagicFaceSwap>` | `video`, `face` | Put a face from an image onto footage |
| `<MagicUpscale>` | `video`, `resolution` (`"1080p"`/`"2k"`/`"4k"`) | Clean up low-res clips |
| `<MagicImageToVideo>` | `image`, `seconds`, optional `prompt` | Animate a still |
| `<MagicVoice>` | `text`, `voice` | Narration as `<Audio>` |
| `<MagicRemoveBackground>` | `image`, optional `background` | Cut-outs as `<Img>` |

Optional on all: `cacheKey` (change it to force a fresh generation), `trim={{ start, end }}` on video jobs.

Voice ids: run `npx magichour-remotion voices`. Prefer the user's own cloned voice or a stock `cv-` voice; never use a real person's voice without their consent.

## Workflow you must follow

1. Write the composition with the components above. Put dynamic text (scripts, names) in composition props so it is editable in the Studio.
2. While the user previews, run `npx magichour-remotion dev` alongside `npx remotion studio`. Missing assets show the source footage with a "Magic Hour · generating…" badge and swap in when ready.
3. Before `remotion render`, run `npx magichour-remotion prefetch` (add `--props <file>` for data-driven renders). Rendering a missing asset fails on purpose with a clear message instead of producing a video with placeholders.
4. To try things without spending credits, add `--mock` to `dev`/`prefetch` (fakes outputs with ffmpeg).

## Cost awareness

Every distinct set of props is a paid generation (lip sync costs about 1 credit per frame). Avoid putting
rapidly changing values (frame numbers, random ids, timestamps) into component props. Check spend with
`npx magichour-remotion status`.
