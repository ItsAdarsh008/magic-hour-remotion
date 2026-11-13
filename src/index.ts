export {
  MagicLipSync,
  MagicFaceSwap,
  MagicTalkingPhoto,
  MagicUpscale,
  MagicImageToVideo,
  MagicVoice,
  MagicRemoveBackground,
} from "./components/index.js";
export type {
  MagicLipSyncProps,
  MagicFaceSwapProps,
  MagicTalkingPhotoProps,
  MagicUpscaleProps,
  MagicImageToVideoProps,
  MagicVoiceProps,
  MagicRemoveBackgroundProps,
} from "./components/index.js";
export { useMagicAsset, type MagicAssetState } from "./components/use-magic-asset.js";
export { MagicBadge, MagicPlaceholder } from "./components/placeholder.js";
export { hashSpec, outputFileFor } from "./core/spec.js";
export type { JobSpec, MagicInput, Manifest, ManifestEntry, AssetStatus } from "./core/spec.js";
