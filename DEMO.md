# Demo video plan (~30s, one take)

**Hook (on screen, 0–2s):** "I made AI video editable like code."

| Time | Shot | What happens |
|---|---|---|
| 0–3s | Split screen: VS Code left, Remotion Studio right | Host clip is playing. On screen: `<MagicLipSync video="host.mp4" text="We ship on Friday." />` |
| 3–6s | Zoom on the code | Change `"We ship on Friday."` to `"We shipped it today."` and hit save |
| 6–10s | Studio | The *Magic Hour · generating…* badge pulses over the footage (speed this part up 4x) |
| 10–16s | Studio, sound on | The result swaps in and the host says the new line. Hold on it. |
| 16–22s | Terminal | `npx magichour-remotion prefetch && npx remotion render`, then the progress bar finishes |
| 22–28s | Final MP4 | Play it full screen |
| 28–30s | Card | "This video was rendered with it. npm i magic-hour-remotion" |

**Recording tips**
- Record `host.mp4` yourself: 6 seconds, facing the camera, mouth moving in the first 2 seconds (the standard and pro lip-sync modes need this).
- Use your own cloned voice (Magic Hour's voice cloner), so the new line sounds like you.
- Generate the "today" line once before recording so the swap is fast on camera, then cut out the wait honestly with a "4x" label.

**X / Hacker News variant:** open with Claude Code. Prompt "make a 20s launch video for Retake using magic-hour-remotion". The agent writes the composition using the skill in `skill/SKILL.md`, you run prefetch, and it renders.
