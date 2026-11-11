/**
 * Regenerates the placeholder media from the running site:
 *   public/posters/<machine>-{landscape,portrait}.webp  still shown until the 3D scene loads
 *   public/video/placeholder.{mp4,webp}                  stand-in for the company film
 *
 * Usage: npm run build && npm run start, then `node scripts/capture-placeholders.cjs`.
 * Needs Playwright (Chromium), sharp and ffmpeg on the machine that runs it.
 */
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const base = process.env.SITE_URL || "http://localhost:3000";
const machine = process.env.MACHINE || "gemini";
const root = path.join(__dirname, "..", "public");
const BANNER = 31;

const hideChrome = `
  header, .stage-tag, .stage-tools, .stage-chapters, .stage-poster, .stage-parts, .stage-card, .stage-balloons { visibility: hidden !important; }
`;

async function openStage(browser, width, height, scale, css) {
  const page = await browser.newPage({
    viewport: { width, height: height + BANNER },
    deviceScaleFactor: scale,
    reducedMotion: "reduce",
  });
  // A fake clock makes every frame land on an exact timestamp.
  await page.clock.install();
  await page.goto(`${base}/it`, { waitUntil: "load" });
  await page.addStyleTag({ content: hideChrome + css });
  for (let i = 0; i < 200 && !(await page.$(".stage-canvas canvas")); i++) {
    await page.clock.runFor(100);
    await page.waitForTimeout(50);
  }
  if (!(await page.$(".stage-canvas canvas"))) throw new Error("3D canvas did not load");
  await page.clock.runFor(200);
  await page.waitForTimeout(300);
  return page;
}

async function poster(browser, name, width, height, scale) {
  const css = `body, .stage-sticky { background: transparent !important; } .stage-giant { visibility: hidden !important; }`;
  const page = await openStage(browser, width, height, scale, css);
  const png = await page.locator(".stage-canvas").screenshot({ omitBackground: true });
  const file = path.join(root, "posters", `${machine}-${name}.webp`);
  await sharp(png).webp({ quality: 72, alphaQuality: 80 }).toFile(file);
  console.log(file, `${Math.round(fs.statSync(file).size / 1024)} KB`);
  await page.close();
}

async function video(browser) {
  const fps = 24;
  const seconds = 8;
  const css = `.stage { --sbg: #0c1110; --sghost: #161d1b; }`;
  const page = await openStage(browser, 1920, 720, 1, css);
  // Motion was frozen for a stable first frame; switch it back on for the clip.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload({ waitUntil: "load" });
  await page.addStyleTag({ content: hideChrome + css });
  for (let i = 0; i < 200 && !(await page.$(".stage-canvas canvas")); i++) {
    await page.clock.runFor(100);
    await page.waitForTimeout(50);
  }
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), "ficep-frames-"));
  for (let i = 0; i < fps * seconds; i++) {
    await page.clock.runFor(1000 / fps);
    await page.locator(".stage-sticky").screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.png`) });
  }
  await page.close();
  const out = path.join(root, "video", "placeholder.mp4");
  // The hero frames the machine right of centre; crop a 16:9 window around it.
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-framerate", String(fps), "-i", path.join(frames, "f%04d.png"),
    "-vf", "crop=1280:720:608:0", "-c:v", "libx264", "-crf", "30", "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out,
  ]);
  const first = await sharp(path.join(frames, "f0000.png")).extract({ left: 608, top: 0, width: 1280, height: 720 }).webp({ quality: 70 }).toBuffer();
  fs.writeFileSync(path.join(root, "video", "placeholder.webp"), first);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log(out, `${Math.round(fs.statSync(out).size / 1024)} KB`);
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const only = process.argv[2];
  if (!only || only === "posters") {
    await poster(browser, "landscape", 1600, 870, 1);
    await poster(browser, "portrait", 400, 770, 2);
  }
  if (!only || only === "video") await video(browser);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
