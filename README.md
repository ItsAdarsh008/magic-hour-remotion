# magic-hour-remotion

**Magic Hour AI as Remotion components.** Lip sync, talking photos, face swap, upscaling, image-to-video, voice and background removal, written like any other part of your video:

```tsx
import { MagicLipSync } from "magic-hour-remotion";

<MagicLipSync video="host.mp4" text="We shipped it today." voice="cv-0001" />
```

Change the `text`, save, and the person on screen says the new line a few seconds later in Remotion Studio. Render as usual, and every result is cached so you never pay twice for the same props.

## Quickstart

```bash
npm i magic-hour-remotion
echo "MAGIC_HOUR_API_KEY=your_key" >> .env    # https://magichour.ai/developer

# terminal 1                     # terminal 2
npx remotion studio              npx magichour-remotion dev

# before rendering
npx magichour-remotion prefetch && npx remotion render
```

No key yet? Add `--mock` to `dev` and `prefetch`. Outputs are faked with ffmpeg so you can build the whole template for free.

## Components

| Component | Props | Output |
|---|---|---|
| `MagicLipSync` | `video`, `audio` **or** `text` + `voice`, `mode?`, `maxFps?`, `trim?` | video |
| `MagicTalkingPhoto` | `image`, `audio` **or** `text` + `voice`, `resolution?` | video |
| `MagicFaceSwap` | `video`, `face`, `trim?` | video |
| `MagicUpscale` | `video`, `resolution` | video |
| `MagicImageToVideo` | `image`, `seconds`, `prompt?`, `model?`, `resolution?` | video |
| `MagicVoice` | `text`, `voice`, `language?`, `speed?` | audio |
| `MagicRemoveBackground` | `image`, `background?` | image |

- Inputs are paths in `public/` (`"host.mp4"`) or https URLs.
- Video components take every `<OffthreadVideo>` prop; `MagicVoice` takes `<Audio>` props; `MagicRemoveBackground` takes `<Img>` props.
- `cacheKey` forces a fresh generation with otherwise identical props.
- `useMagicAsset(spec)` is exported if you want to build your own component.
- `npx magichour-remotion voices` lists the voice ids you can use.

## How it works

Remotion renders frame by frame and needs every frame to come out the same each time. AI jobs are slow and asynchronous. So the plugin never calls the API during a render:

1. Each component turns its props into a job spec and hashes it.
2. It looks the hash up in `public/magichour/manifest.json`.
3. **In Studio:** if the asset is missing, the component writes a request to `public/magichour/requests/`. `magichour-remotion dev` picks it up, calls Magic Hour, saves the file to `public/magichour/out/` and updates the manifest. The Studio polls the manifest and swaps the result in. Until then you see the source footage with a small *Magic Hour · generating…* badge.
4. **Before rendering:** `magichour-remotion prefetch` renders your compositions at 10% scale in a "collect" mode where components report the jobs they need instead of drawing. Then it generates whatever isn't cached. Use `--props data.json` for data-driven templates, or `--from-requests` to skip the scan.
5. **While rendering:** a missing asset stops the render with a clear message. You never ship a video with placeholder frames in it.

Specs can be nested. `text` + `voice` on `MagicLipSync` is a voice job feeding a lip-sync job, and the runner generates them in order.

## CLI

```
magichour-remotion dev        Watch the Studio and generate as you edit
magichour-remotion prefetch   Generate everything your compositions need
magichour-remotion status     What's generated / failed, and credits spent
magichour-remotion voices     List voice ids

--public <dir>  --entry <file>  --composition <id>  --props <json|file>
--browser <path>  --every-nth-frame <n>  --from-requests  --retry  --concurrency <n>  --mock
```

Failed jobs are not retried automatically. Fix the cause, then restart `dev` or run `prefetch --retry`.

## Costs

Every distinct set of props is one paid generation. Lip sync is about 1 credit per frame (`pro` mode is 2), so a 5-second clip at 30fps is about 150 credits. Keep fast-changing values like frame numbers and timestamps out of component props. Saving a script line five times while you write it means five generations, so write the line first, then save.

## Example

`example/` is a Remotion project with two compositions:

- **ScriptEdit**: the demo. Edit `line` in the Studio's props panel and the host re-lip-syncs. The code on screen updates to match.
- **FounderUpdate**: a vertical talking-headshot update made from a photo and a script.

```bash
cd example && npm i
MAGICHOUR_MOCK=1 npx magichour-remotion dev   # or set MAGIC_HOUR_API_KEY
npx remotion studio
```

Replace `public/host.mp4` (a talking-head clip with the mouth visible in the first few seconds) and `public/founder.png` with real footage.

## Development

```bash
npm i && npm test     # builds, then runs runner/hash tests with a fake backend
```

MIT
