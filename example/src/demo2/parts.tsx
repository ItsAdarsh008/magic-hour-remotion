import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAY, EASE, INK, MUTED, SANS, SERIF } from "./theme";
import events from "../demo-events.json";

// ---------------------------------------------------------------------------
// Film grain: a static noise tile, offset every frame. Breaks up flat digital fills.
// ---------------------------------------------------------------------------
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const x = Math.floor(random(`gx${frame}`) * 512);
  const y = Math.floor(random(`gy${frame}`) * 512);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("demo/grain.png")})`,
        backgroundPosition: `${x}px ${y}px`,
        mixBlendMode: "multiply",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Words that rise in one after another
// ---------------------------------------------------------------------------
export const Rise: React.FC<{
  text: string;
  at?: number;
  size: number;
  color?: string;
  italic?: boolean;
  family?: string;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, at = 0, size, color = INK, italic, family = SERIF, stagger = 3, style }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ fontFamily: family, fontSize: size, lineHeight: 1.02, color, fontStyle: italic ? "italic" : "normal", letterSpacing: family === SERIF ? -0.5 : -0.2, ...style }}>
      {words.map((w, i) => {
        const t = interpolate(frame - at - i * stagger, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: size * 0.08 }}>
            <span style={{ display: "inline-block", translate: `0 ${(1 - t) * 105}%`, opacity: t }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/** Small uppercase label with a rule, used to name what's on screen. */
export const Tag: React.FC<{ children: React.ReactNode; color?: string; at?: number; style?: React.CSSProperties }> = ({ children, color = MUTED, at = 0, style }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - at, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: SANS, fontWeight: 500, fontSize: 22, letterSpacing: 3, textTransform: "uppercase", color, opacity: t, ...style }}>
      <span style={{ width: 36 * t, height: 2, background: color }} />
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Real Remotion Studio footage with a virtual camera and a cursor rebuilt from the
// click log captured while recording.
// ---------------------------------------------------------------------------
type Ev = { t: number; kind: string; x: number; y: number; label: string };
const EVENTS = events as Ev[];

export type CamKey = { f: number; z: number; x: number; y: number }; // focus point in recording px

const camAt = (frame: number, keys: CamKey[]) => {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.f) {
      const t = interpolate(frame, [a.f, b.f], [0, 1], { easing: EASE });
      return { f: frame, z: a.z + (b.z - a.z) * t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return keys[keys.length - 1];
};

const cursorAt = (rec: number) => {
  const pts = EVENTS.filter((e) => e.kind === "move" || e.kind === "click");
  let prev = pts[0];
  for (const p of pts) {
    if (p.t > rec) {
      // glide from the previous point to the next one over the last 0.6s before it
      const t = interpolate(rec, [p.t - 0.6, p.t], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
      return { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t };
    }
    prev = p;
  }
  return { x: prev.x, y: prev.y };
};

const lastClick = (rec: number) => {
  const clicks = EVENTS.filter((e) => e.kind === "click" && e.t <= rec);
  return clicks.length ? clicks[clicks.length - 1] : undefined;
};

export const StudioShot: React.FC<{
  /** where in the recording (seconds) this shot starts */
  recStart: number;
  speed?: number;
  cam: CamKey[];
  /** size of the viewport the window is placed in */
  w: number;
  h: number;
  showCursor?: boolean;
}> = ({ recStart, speed = 1, cam, w, h, showCursor = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rec = recStart + (frame / fps) * speed;
  const c = camAt(frame, cam);
  // fit the 1920x1080 recording into the viewport at z=1, then zoom around the focus point
  const base = Math.min(w / 1920, h / 1080) * 0.92;
  const s = base * c.z;
  const tx = w / 2 - c.x * s;
  const ty = h / 2 - c.y * s;
  const cur = cursorAt(rec);
  const click = lastClick(rec);
  const sinceClick = click ? rec - click.t : 99;
  const press = sinceClick < 0.18 ? 0.86 : 1;
  const ring = interpolate(sinceClick, [0, 0.45], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(40,30,10,0.28), 0 0 0 1px rgba(0,0,0,0.25)",
        }}
      >
        <OffthreadVideo src={staticFile("demo/studio.mp4")} trimBefore={Math.round(recStart * fps)} playbackRate={speed} muted style={{ width: 1920, height: 1080 }} />
        {showCursor ? (
          <div style={{ position: "absolute", left: cur.x, top: cur.y }}>
            {click && sinceClick < 0.45 ? (
              <div
                style={{
                  position: "absolute",
                  left: -28 - ring * 10,
                  top: -28 - ring * 10,
                  width: 56 + ring * 20,
                  height: 56 + ring * 20,
                  borderRadius: "50%",
                  border: `3px solid ${CLAY}`,
                  opacity: 1 - ring,
                }}
              />
            ) : null}
            <svg width="30" height="40" viewBox="0 0 30 40" style={{ position: "absolute", left: -3, top: -2, scale: `${press}`, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}>
              <path d="M2 2 L2 31 L9.5 24 L14.5 36 L19.5 34 L14.5 22.5 L25 22.5 Z" fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** A still image of a chart layer, placed like the race canvas (1080x1080). */
export const LayerImg: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ width: 1080, height: 1080, display: "block", ...style }} />
);
