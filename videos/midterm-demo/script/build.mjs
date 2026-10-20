// 편별 HyperFrames 컴포지션(epNN.html)을 만든다.
// 입력: script/narration.json(문장), assets/vo/timing.json(문장 길이), script/episodes.mjs(장면)
// 실행: node script/build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EPISODES } from "./episodes.mjs";
import { introBody, outroBody } from "./bookends.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIMING = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/vo/timing.json"), "utf8"));

export const LEAD = 1.4; // 첫 문장 전 등장 시간
export const GAP = 0.5; // 문장 사이 쉼
export const TAIL = 1.6; // 마지막 문장 뒤 여운

// ---------- 공통 ----------
function pngSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r2 = (n) => Math.round(n * 100) / 100;

export function beatTimes(ep) {
  const lines = TIMING[ep];
  let t = LEAD;
  const out = lines.map((l) => {
    const row = { start: r2(t), dur: l.dur, file: l.file, text: l.text };
    t += l.dur + GAP;
    return row;
  });
  // 마지막 편은 "감사합니다" 뒤에 조금 더 머문다
  return { lines: out, duration: r2(t - GAP + (ep === "ep07" ? TAIL + 2 : TAIL)) };
}

const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/><path d="M3.2 12.5h4.3l1.5-3 3 6 1.5-3h7.3"/>',
};
export const icon = (name, size = 28, stroke = "currentColor") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

export const BASE_CSS = `
@font-face { font-family: "Pretendard"; src: url("assets/fonts/Pretendard-Regular.woff2") format("woff2"); font-weight: 400; }
@font-face { font-family: "Pretendard"; src: url("assets/fonts/Pretendard-Medium.woff2") format("woff2"); font-weight: 500; }
@font-face { font-family: "Pretendard"; src: url("assets/fonts/Pretendard-SemiBold.woff2") format("woff2"); font-weight: 600; }
@font-face { font-family: "Pretendard"; src: url("assets/fonts/Pretendard-Bold.woff2") format("woff2"); font-weight: 700; }
@font-face { font-family: "Pretendard"; src: url("assets/fonts/Pretendard-ExtraBold.woff2") format("woff2"); font-weight: 800; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: #f2f4fa; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #f2f4fa; color: #1b2453;
  font-family: "Pretendard", sans-serif; word-break: keep-all; }
.abs { position: absolute; }
/* 배경: 은은한 점 격자 + 남색·인디고 빛 */
.bg-dots { position: absolute; inset: 0; background-image: radial-gradient(#c9d0e6 1.6px, transparent 1.6px); background-size: 34px 34px; opacity: 0.55; }
.bg-glow { position: absolute; border-radius: 50%; filter: blur(10px); }
.glow-a { width: 1100px; height: 1100px; right: -320px; top: -420px; background: radial-gradient(circle, rgba(79,70,229,0.20), rgba(79,70,229,0) 65%); }
.glow-b { width: 900px; height: 900px; left: -380px; bottom: -460px; background: radial-gradient(circle, rgba(27,36,83,0.14), rgba(27,36,83,0) 65%); }
.ghost { position: absolute; font-weight: 800; font-size: 300px; letter-spacing: -0.04em; color: rgba(27,36,83,0.035); white-space: nowrap; }
/* 자막 */
.cap { position: absolute; left: 50%; bottom: 30px; width: 1560px; margin-left: -780px; display: flex; justify-content: center; opacity: 0; }
.cap.stage { left: 690px; width: 1170px; margin-left: 0; }
.cap.stage span { max-width: 1170px; font-size: 29px; }
.cap span { display: block; max-width: 1560px; background: rgba(20,27,66,0.92); color: #f6f7ff; font-size: 30px; font-weight: 500;
  line-height: 1.45; padding: 14px 30px; border-radius: 16px; text-align: center; box-shadow: 0 10px 30px rgba(20,27,66,0.25); }
`;

const PAGE_CSS = `
.panel { position: absolute; left: 110px; top: 92px; }
.chiprow { display: flex; gap: 12px; align-items: center; }
.chip { font-size: 22px; font-weight: 700; padding: 9px 18px; border-radius: 999px; color: #fff; }
.chip.worker { background: #4f46e5; }
.chip.manager { background: #1b2453; }
.chip.no { background: #fff; color: #1b2453; border: 2px solid #d5dbec; }
.title { margin-top: 26px; font-size: 64px; line-height: 1.16; font-weight: 800; letter-spacing: -0.03em; white-space: pre-line; }
.subtitle { margin-top: 18px; font-size: 27px; line-height: 1.4; color: #4b5578; font-weight: 500; }
.rule { margin-top: 30px; height: 4px; width: 120px; background: #4f46e5; border-radius: 4px; transform-origin: left center; }
.steps { margin-top: 30px; display: flex; flex-direction: column; gap: 10px; }
.step { display: flex; align-items: center; gap: 16px; padding: 10px 18px 10px 12px; border-radius: 16px; font-size: 25px; font-weight: 600; color: #586189; position: relative; }
.step .num { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 800; background: #e4e8f4; color: #4b5578; }
.step .bgfill { position: absolute; inset: 0; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px rgba(27,36,83,0.10); border: 2px solid #c9cdf7; opacity: 0; }
.step .num, .step .lbl { position: relative; }
.step.on .lbl { color: #1b2453; }
.steps.compact { gap: 6px; }
.steps.compact .step { padding: 6px 16px 6px 10px; font-size: 23px; }
.steps.compact .step .num { width: 34px; height: 34px; flex-basis: 34px; font-size: 18px; }
/* 휴대폰 */
.phone-wrap { position: absolute; left: 812px; top: 52px; width: 418px; height: 872px; }
.phone-scale { position: absolute; left: 0; top: 0; width: 418px; height: 872px; transform: scale(0.94); transform-origin: 50% 0; }
.phone { position: absolute; inset: 0; border-radius: 62px; background: #111633; box-shadow: 0 40px 80px rgba(27,36,83,0.28), 0 0 0 2px #2a3160 inset; }
.screen { position: absolute; left: 14px; top: 14px; width: 390px; height: 844px; border-radius: 48px; overflow: hidden; background: #f4f5f9; }
.layer { position: absolute; inset: 0; opacity: 0; }
.scroller { position: absolute; left: 0; top: 0; width: 390px; }
.scroller img { display: block; width: 390px; }
.tabbar { position: absolute; left: 0; bottom: 0; width: 390px; }
.hlbox { position: absolute; border: 3px solid #4f46e5; border-radius: 14px; box-shadow: 0 0 0 6px rgba(79,70,229,0.18); opacity: 0; }
.tap { position: absolute; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; background: rgba(79,70,229,0.35); border: 3px solid rgba(79,70,229,0.9); opacity: 0; }
.punch { position: absolute; left: 50%; top: 10px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: #05070f; }
/* 확대 카드 */
.lens { position: absolute; left: 1296px; top: 176px; width: 524px; background: #fff; border-radius: 26px; border: 2px solid #d5dbec;
  box-shadow: 0 30px 60px rgba(27,36,83,0.16); overflow: hidden; opacity: 0; }
.lens .lhead { display: flex; align-items: center; gap: 10px; padding: 16px 22px; font-size: 21px; font-weight: 700; color: #4f46e5; border-bottom: 2px solid #eef0f8; }
.lens .lhead i { width: 10px; height: 10px; border-radius: 50%; background: #4f46e5; display: block; }
.lens .lview { position: relative; overflow: hidden; }
.lens .lview img { position: absolute; left: 0; top: 0; display: block; }
/* 안내 카드 */
.note { position: absolute; width: 524px; background: #1b2453; color: #fff; border-radius: 26px; padding: 34px 36px; opacity: 0; box-shadow: 0 30px 60px rgba(27,36,83,0.25); }
.note .nicon { width: 64px; height: 64px; border-radius: 18px; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; }
.note .ntitle { margin-top: 22px; font-size: 36px; font-weight: 800; line-height: 1.25; letter-spacing: -0.02em; }
.note .nbody { margin-top: 14px; font-size: 25px; line-height: 1.5; color: #d9ddf5; font-weight: 500; }
/* 잠금 화면 */
.lock { position: absolute; inset: 0; background: radial-gradient(120% 80% at 30% 20%, #4f46e5 0%, #26307a 45%, #121838 100%); color: #fff; }
.lock .ltime { position: absolute; left: 0; right: 0; top: 150px; text-align: center; font-size: 92px; font-weight: 700; letter-spacing: -0.02em; }
.lock .ldate { position: absolute; left: 0; right: 0; top: 116px; text-align: center; font-size: 22px; font-weight: 600; opacity: 0.85; }
.notif { position: absolute; left: 14px; top: 300px; width: 362px; border-radius: 26px; background: rgba(250,250,255,0.94); color: #141a3a; padding: 16px 18px; display: flex; gap: 14px; opacity: 0; }
.notif .appi { width: 46px; height: 46px; flex: 0 0 46px; border-radius: 12px; background: #4f46e5; display: flex; align-items: center; justify-content: center; }
.notif .nt { font-size: 17px; font-weight: 700; display: flex; justify-content: space-between; }
.notif .nt em { font-style: normal; font-weight: 500; color: #4f5778; font-size: 15px; }
.notif .nb { margin-top: 4px; font-size: 17px; line-height: 1.4; font-weight: 500; }
/* 브라우저 창 */
.win { position: absolute; left: 690px; top: 96px; width: 1150px; height: 763px; border-radius: 20px; background: #fff; overflow: hidden;
  box-shadow: 0 40px 90px rgba(27,36,83,0.24), 0 0 0 2px #d5dbec; }
.chrome { position: absolute; left: 0; top: 0; width: 1150px; height: 44px; background: #e9ecf5; display: flex; align-items: center; padding-left: 20px; gap: 9px; }
.chrome b { width: 13px; height: 13px; border-radius: 50%; display: block; }
.url { margin-left: 26px; height: 28px; width: 560px; border-radius: 9px; background: #fff; font-size: 16px; color: #4b5578; display: flex; align-items: center; padding-left: 14px; font-weight: 500; }
.view { position: absolute; left: 0; top: 44px; width: 1150px; height: 719px; overflow: hidden; background: #f4f5f9; }
.world { position: absolute; left: 0; top: 0; width: 1440px; transform-origin: 0 0; }
.world img { display: block; width: 1440px; }
.mhl { position: absolute; border-radius: 16px; opacity: 0; }
.cursor { position: absolute; left: 0; top: 0; width: 46px; height: 46px; opacity: 0; }
.cring { position: absolute; width: 70px; height: 70px; margin: -35px 0 0 -35px; border-radius: 50%; border: 4px solid #4f46e5; opacity: 0; }
/* 작은 휴대폰 (관리자 → 현장 알림) */
.mini { position: absolute; left: 1560px; top: 300px; width: 300px; height: 610px; border-radius: 46px; background: #111633; opacity: 0; box-shadow: 0 30px 70px rgba(20,27,66,0.35); }
.mini .mscreen { position: absolute; left: 11px; top: 11px; width: 278px; height: 588px; border-radius: 36px; overflow: hidden; }
.mini .notif { left: 10px; top: 180px; width: 258px; padding: 12px 13px; gap: 10px; border-radius: 20px; }
.mini .notif .appi { width: 36px; height: 36px; flex-basis: 36px; border-radius: 10px; }
.mini .notif .nt { font-size: 14px; } .mini .notif .nt em { font-size: 12px; } .mini .notif .nb { font-size: 14px; }
.mini .ltime { top: 70px; font-size: 64px; } .mini .ldate { top: 48px; font-size: 16px; }
.mini .mlabel { position: absolute; left: 0; right: 0; bottom: -46px; text-align: center; font-size: 21px; font-weight: 700; color: #1b2453; }
`;

function backdrop(ghostText) {
  return `<div class="bg-dots"></div><div class="bg-glow glow-a"></div><div class="bg-glow glow-b"></div>
  <div class="ghost" data-layout-ignore aria-hidden="true" style="left:60px; bottom:-70px">${esc(ghostText)}</div>`;
}

export function captions(epId, lines, cls = "") {
  return lines
    .map((l, i) => `<div class="cap ${cls}" id="cap-${epId}-${i}"><span>${esc(l.text)}</span></div>`)
    .join("\n");
}
export function audios(epId, lines) {
  return lines
    .map((l, i) => `<audio id="vo-${epId}-${i}" src="${l.file}" data-start="${l.start}" data-duration="${l.dur}" data-track-index="9" data-volume="1"></audio>`)
    .join("\n");
}
// 자막·배경 공통 움직임
export function captionTweens(epId, lines) {
  return lines
    .map((l, i) => {
      const id = `#cap-${epId}-${i}`;
      return `tl.fromTo("${id}", {opacity:0, y:14}, {opacity:1, y:0, duration:0.3, ease:"power2.out", immediateRender:false}, ${r2(l.start - 0.1)});
tl.to("${id}", {opacity:0, duration:0.25, ease:"power1.in"}, ${r2(l.start + l.dur + 0.15)});`;
    })
    .join("\n");
}
export function ambientTweens(duration) {
  const n = Math.max(1, Math.floor(duration / 8));
  return `tl.fromTo(".glow-a", {scale:1, x:0}, {scale:1.12, x:-40, duration:4, ease:"sine.inOut", yoyo:true, repeat:${n * 2 - 1}}, 0);
tl.fromTo(".glow-b", {scale:1.1, y:0}, {scale:1, y:-30, duration:4, ease:"sine.inOut", yoyo:true, repeat:${n * 2 - 1}}, 0);
tl.fromTo(".ghost", {x:0}, {x:-120, duration:${r2(duration)}, ease:"none"}, 0);`;
}

export function page(epId, duration, css, body, script) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>돌봄이음 중간보고 ${epId}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
</head>
<body>
<div id="root" data-composition-id="${epId}" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080">
<style>${BASE_CSS}${css}</style>
${body}
<script>
const tl = gsap.timeline({ paused: true });
${script}
window.__timelines["${epId}"] = tl;
</script>
</div>
</body>
</html>
`;
}

// ---------- 왼쪽 패널 ----------
function panel(epId, ep, width) {
  const chipMode = ep.mode === "worker" ? "현장인력 모드" : "관리자 모드";
  const steps = ep.beats
    .map(
      (b, i) => `<div class="step" id="${epId}-step-${i}"><div class="bgfill"></div><div class="num">${i + 1}</div><div class="lbl">${esc(b.step)}</div></div>`,
    )
    .join("");
  return `<div class="panel" style="width:${width}px">
  <div class="chiprow" id="${epId}-chips"><div class="chip ${ep.mode}">${chipMode}</div><div class="chip no">${ep.no} / 06</div></div>
  <div class="title" id="${epId}-title">${esc(ep.title)}</div>
  <div class="subtitle" id="${epId}-sub">${esc(ep.subtitle)}</div>
  <div class="rule" id="${epId}-rule"></div>
  <div class="steps${ep.beats.length > 6 ? " compact" : ""}">${steps}</div>
</div>`;
}
function panelTweens(epId, ep, lines) {
  const out = [];
  out.push(`tl.fromTo("#${epId}-chips", {opacity:0, x:-30}, {opacity:1, x:0, duration:0.5, ease:"power3.out"}, 0.15);`);
  out.push(`tl.fromTo("#${epId}-title", {opacity:0, y:36}, {opacity:1, y:0, duration:0.7, ease:"expo.out"}, 0.3);`);
  out.push(`tl.fromTo("#${epId}-sub", {opacity:0, y:20}, {opacity:1, y:0, duration:0.6, ease:"power2.out"}, 0.5);`);
  out.push(`tl.fromTo("#${epId}-rule", {scaleX:0}, {scaleX:1, duration:0.6, ease:"power3.inOut"}, 0.6);`);
  ep.beats.forEach((b, i) => {
    out.push(`tl.fromTo("#${epId}-step-${i}", {opacity:0, x:-24}, {opacity:1, x:0, duration:0.45, ease:"back.out(1.6)"}, ${r2(0.75 + i * 0.06)});`);
  });
  lines.forEach((l, i) => {
    const s = `#${epId}-step-${i}`;
    const t = r2(l.start - 0.15);
    out.push(`tl.to("${s} .bgfill", {opacity:1, duration:0.35, ease:"power2.out"}, ${t});`);
    out.push(`tl.to("${s} .num", {backgroundColor:"#4f46e5", color:"#ffffff", scale:1.08, duration:0.35, ease:"back.out(2)"}, ${t});`);
    out.push(`tl.to("${s} .lbl", {color:"#1b2453", duration:0.35}, ${t});`);
    if (i < lines.length - 1) {
      const e = r2(lines[i + 1].start - 0.15);
      out.push(`tl.to("${s} .bgfill", {opacity:0, duration:0.3}, ${e});`);
      out.push(`tl.to("${s} .num", {backgroundColor:"#d9ddf5", color:"#4f46e5", scale:1, duration:0.3}, ${e});`);
      out.push(`tl.to("${s} .lbl", {color:"#4b5578", duration:0.3}, ${e});`);
    }
  });
  return out.join("\n");
}
function noteEl(id, note, left, top) {
  return `<div class="note" id="${id}" style="left:${left}px; top:${top}px"><div class="nicon">${icon(note.icon, 34, "#ffffff")}</div>
  <div class="ntitle">${esc(note.title)}</div><div class="nbody">${esc(note.body)}</div></div>`;
}
function notifEl(id, extraClass = "") {
  return `<div class="notif ${extraClass}" id="${id}"><div class="appi">${icon("heart", 26, "#ffffff")}</div>
  <div><div class="nt">돌봄이음 <em>지금</em></div><div class="nb">확인이 필요한 대상자가 있습니다. 눌러서 확인해 주세요.</div></div></div>`;
}

// ---------- 현장인력 편 ----------
function buildWorker(epId, ep) {
  const { lines, duration } = beatTimes(epId);
  // 화면별 정보
  const screenIds = [...new Set([ep.start, ...ep.beats.flatMap((b) => [b.screen, b.after?.screen].filter(Boolean))])];
  const screens = {};
  for (const s of screenIds) {
    if (s === "lock") { screens[s] = { lock: true, h: 844 }; continue; }
    const size = pngSize(`assets/screens/${s}.png`);
    const h = Math.round(size.h / 3);
    screens[s] = { src: `assets/screens/${s}.png`, h, full: s.endsWith("_full") };
  }
  // 비트별 상태(화면·스크롤·확대) — after가 있으면 하위 상태로 펼친다
  const states = [];
  ep.beats.forEach((b, i) => {
    const t0 = lines[i].start;
    states.push({ i, sub: 0, t: t0, ...b });
    if (b.after) states.push({ i, sub: 1, t: r2(t0 + b.after.at), screen: b.after.screen, tap: b.after.tap, lens: b.after.lens, scroll: b.after.scroll });
  });

  // DOM
  const hlBoxes = {};
  let lensHtml = "";
  let noteHtml = "";
  states.forEach((s, k) => {
    if (s.lens) {
      const scr = screens[s.screen];
      const sc = Math.min(520 / s.lens.w, 2.6);
      const vw = 520, vh = Math.round(Math.min(s.lens.h * sc, 600));
      const offX = Math.round((vw - s.lens.w * sc) / 2);
      lensHtml += `<div class="lens" id="${epId}-lens-${k}" style="top:${Math.max(110, Math.round(470 - (vh + 58) / 2))}px"><div class="lhead"><i></i>확대해서 보기</div>
      <div class="lview" style="width:${vw}px; height:${vh}px"><img data-layout-allow-overflow src="${scr.src}" style="width:${r2(390 * sc)}px; left:${r2(offX - s.lens.x * sc)}px; top:${r2(-s.lens.y * sc)}px" /></div></div>`;
      (hlBoxes[s.screen] ||= []).push(`<div class="hlbox" id="${epId}-hl-${k}" style="left:${s.lens.x}px; top:${s.lens.y}px; width:${s.lens.w}px; height:${s.lens.h}px"></div>`);
    }
    if (s.note) noteHtml += noteEl(`${epId}-note-${k}`, s.note, 1296, 300);
  });
  const layers = screenIds
    .map((s) => {
      const scr = screens[s];
      if (scr.lock) {
        return `<div class="layer" id="${epId}-L-${s}"><div class="lock"><div class="ldate">10월 20일 화요일</div><div class="ltime">9:41</div>${notifEl(`${epId}-notif`)}</div></div>`;
      }
      const tab = scr.full ? `<img class="tabbar" src="assets/screens/w_tabbar.png" />` : "";
      return `<div class="layer" id="${epId}-L-${s}"><div class="scroller" id="${epId}-S-${s}" data-layout-allow-overflow><img src="${scr.src}" />${(hlBoxes[s] || []).join("")}</div>${tab}</div>`;
    })
    .join("\n");
  const taps = states.filter((s) => s.tap).map((s, n) => `<div class="tap" id="${epId}-tap-${s.i}-${s.sub}" style="left:${s.tap.x}px; top:${s.tap.y}px"></div>`).join("");

  const body = `${backdrop("돌봄이음")}
${panel(epId, ep, 640)}
<div class="phone-wrap" id="${epId}-phone"><div class="phone-scale"><div class="phone"><div class="screen">
${layers}
${taps}
</div><div class="punch"></div></div></div></div>
${lensHtml}
${noteHtml}
${captions(epId, lines, "stage")}
${audios(epId, lines)}`;

  // 타임라인
  const tw = [];
  tw.push(ambientTweens(duration));
  tw.push(panelTweens(epId, ep, lines));
  tw.push(`tl.fromTo("#${epId}-phone", {opacity:0, y:80, rotation:2}, {opacity:1, y:0, rotation:0, duration:0.9, ease:"power3.out"}, 0.35);`);
  tw.push(`tl.set("#${epId}-L-${ep.start}", {opacity:1}, 0);`);
  let cur = ep.start;
  const scrollOf = {}; // 화면별 현재 스크롤
  let prevLens = null;
  let prevNote = null;
  states.forEach((s, k) => {
    let t = s.t;
    if (s.tap) {
      const id = `#${epId}-tap-${s.i}-${s.sub}`;
      const at = r2(t + 0.2);
      tw.push(`tl.fromTo("${id}", {opacity:0, scale:0.4}, {opacity:1, scale:1, duration:0.18, ease:"power2.out", immediateRender:false}, ${at});`);
      tw.push(`tl.to("${id}", {opacity:0, scale:1.9, duration:0.45, ease:"power2.out"}, ${r2(at + 0.2)});`);
      t = r2(at + 0.35);
    }
    if (s.screen !== cur) {
      tw.push(`tl.to("#${epId}-L-${cur}", {opacity:0, x:-30, duration:0.4, ease:"power2.in"}, ${t});`);
      const sc = s.scroll || 0;
      tw.push(`tl.set("#${epId}-S-${s.screen}", {y:${-sc}}, ${t});`);
      scrollOf[s.screen] = sc;
      tw.push(`tl.fromTo("#${epId}-L-${s.screen}", {opacity:0, x:40}, {opacity:1, x:0, duration:0.5, ease:"power3.out", immediateRender:false}, ${r2(t + 0.15)});`);
      if (s.screen === "lock") {
        tw.push(`tl.fromTo("#${epId}-notif", {opacity:0, y:-60, scale:0.9}, {opacity:1, y:0, scale:1, duration:0.7, ease:"back.out(1.7)", immediateRender:false}, ${r2(t + 1.0)});`);
      }
      cur = s.screen;
    } else if (s.scroll !== undefined && s.scroll !== (scrollOf[cur] || 0)) {
      tw.push(`tl.to("#${epId}-S-${cur}", {y:${-s.scroll}, duration:1.1, ease:"power2.inOut"}, ${r2(t)});`);
      scrollOf[cur] = s.scroll;
      t = r2(t + 0.6);
    }
    // 확대 카드·강조 상자 교체
    const lt = r2(t + 0.25);
    if (prevLens !== null) {
      tw.push(`tl.to("#${epId}-lens-${prevLens}", {opacity:0, y:-20, duration:0.3, ease:"power2.in"}, ${r2(lt - 0.25)});`);
      tw.push(`tl.to("#${epId}-hl-${prevLens}", {opacity:0, duration:0.25}, ${r2(lt - 0.25)});`);
      prevLens = null;
    }
    if (prevNote !== null && (s.note || s.lens)) {
      tw.push(`tl.to("#${epId}-note-${prevNote}", {opacity:0, y:-20, duration:0.3}, ${r2(lt - 0.25)});`);
      prevNote = null;
    }
    if (s.lens) {
      tw.push(`tl.fromTo("#${epId}-hl-${k}", {opacity:0, scale:1.06}, {opacity:1, scale:1, duration:0.35, ease:"power2.out", immediateRender:false}, ${lt});`);
      tw.push(`tl.fromTo("#${epId}-lens-${k}", {opacity:0, y:30, scale:0.96}, {opacity:1, y:0, scale:1, duration:0.55, ease:"back.out(1.4)", immediateRender:false}, ${r2(lt + 0.1)});`);
      prevLens = k;
    }
    if (s.note) {
      tw.push(`tl.fromTo("#${epId}-note-${k}", {opacity:0, y:30}, {opacity:1, y:0, duration:0.6, ease:"expo.out", immediateRender:false}, ${r2(lt + 0.1)});`);
      prevNote = k;
    }
  });
  tw.push(captionTweens(epId, lines));
  return page(epId, duration, PAGE_CSS, body, tw.join("\n"));
}

// ---------- 관리자 편 ----------
const VW = 1150, VH = 719, WIN = { left: 690, top: 96 + 44 };
function camera(rect, imgH) {
  const s0 = VW / 1440;
  if (!rect) return { s: r2(s0 * 1000) / 1000, x: 0, y: 0 };
  let s = Math.min(VW / rect.w, VH / rect.h) * 0.94;
  s = Math.max(s0, Math.min(s, 2.1));
  let x = VW / 2 - s * (rect.x + rect.w / 2);
  let y = VH / 2 - s * (rect.y + rect.h / 2);
  x = Math.min(0, Math.max(VW - s * 1440, x));
  y = Math.min(0, Math.max(Math.min(0, VH - s * imgH), y));
  return { s: Math.round(s * 1000) / 1000, x: Math.round(x), y: Math.round(y) };
}
const toScreen = (cam, p) => ({ x: Math.round(WIN.left + cam.x + cam.s * p.x), y: Math.round(WIN.top + cam.y + cam.s * p.y) });
const URLS = {
  m_signals: "dolbomieum.kr/signals",
  m_signal_detail: "dolbomieum.kr/signals/C-0012",
  m_briefing_list: "dolbomieum.kr/briefing",
  m_briefing_before: "dolbomieum.kr/briefing/C-0012",
  m_briefing_loading: "dolbomieum.kr/briefing/C-0012",
  m_briefing_after: "dolbomieum.kr/briefing/C-0012",
  m_clients: "dolbomieum.kr/clients",
  m_client_new: "dolbomieum.kr/clients/new",
  m_client_detail: "dolbomieum.kr/clients/C-0012",
  m_metrics: "dolbomieum.kr/metrics",
};
const CURSOR_SVG = `<svg width="46" height="46" viewBox="0 0 24 24"><path d="M4 2.5 19.5 12l-6.6 1.6L9.6 20z" fill="#1b2453" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

function buildManager(epId, ep) {
  const { lines, duration } = beatTimes(epId);
  const screenIds = [...new Set([ep.start, ...ep.beats.flatMap((b) => [b.via?.screen, b.screen, b.after?.screen].filter(Boolean))])];
  const H = {};
  for (const s of screenIds) H[s] = Math.round(pngSize(`assets/screens/${s}.png`).h / 2);
  const states = [];
  ep.beats.forEach((b, i) => {
    const t0 = lines[i].start;
    states.push({ i, sub: 0, t: t0, ...b });
    if (b.after) states.push({ i, sub: 1, t: r2(t0 + b.after.at), screen: b.after.screen, click: { ...b.after.click, at: 0 }, zoom: b.after.zoom, hl: b.after.hl });
  });
  const hls = {};
  let noteHtml = "";
  states.forEach((s, k) => {
    if (s.hl) {
      const cam = camera(s.zoom, H[s.screen]);
      const bw = r2(3.5 / cam.s), sh = r2(7 / cam.s);
      (hls[s.screen] ||= []).push(`<div class="mhl" id="${epId}-hl-${k}" style="left:${s.hl.x}px; top:${s.hl.y}px; width:${s.hl.w}px; height:${s.hl.h}px; border:${bw}px solid #4f46e5; box-shadow:0 0 0 ${sh}px rgba(79,70,229,0.16)"></div>`);
    }
    if (s.note) noteHtml += noteEl(`${epId}-note-${k}`, s.note, 1270, 560);
  });
  const layers = screenIds
    .map((s) => `<div class="layer" id="${epId}-L-${s}"><div class="world" id="${epId}-W-${s}" data-layout-allow-overflow><img src="assets/screens/${s}.png" />${(hls[s] || []).join("")}</div></div>`)
    .join("\n");
  const urls = screenIds.map((s) => `<div class="url abs" id="${epId}-U-${s}" style="left:${100}px; top:8px; opacity:0">🔒 ${URLS[s]}</div>`).join("");
  const clicks = states.filter((s) => s.click);
  const rings = clicks.map((s) => `<div class="cring" id="${epId}-ring-${s.i}-${s.sub}"></div>`).join("");
  const push = ep.beats.some((b) => b.phonePush !== undefined)
    ? `<div class="mini" id="${epId}-mini"><div class="mscreen"><div class="lock"><div class="ldate">10월 20일 화요일</div><div class="ltime">9:41</div>${notifEl(`${epId}-mnotif`)}</div></div><div class="mlabel">현장인력 휴대폰</div></div>`
    : "";

  const body = `${backdrop("돌봄이음")}
${panel(epId, ep, 540)}
<div class="win" id="${epId}-win"><div class="chrome"><b style="background:#ff5f57"></b><b style="background:#febc2e"></b><b style="background:#28c840"></b></div>${urls}
<div class="view">${layers}</div></div>
${rings}
<div class="cursor" id="${epId}-cursor">${CURSOR_SVG}</div>
${push}
${noteHtml}
${captions(epId, lines, "stage")}
${audios(epId, lines)}`;

  const tw = [];
  tw.push(ambientTweens(duration));
  tw.push(panelTweens(epId, ep, lines));
  tw.push(`tl.fromTo("#${epId}-win", {opacity:0, y:70, scale:0.97}, {opacity:1, y:0, scale:1, duration:0.9, ease:"power3.out"}, 0.35);`);
  const cam0 = camera(null, H[ep.start]);
  tw.push(`tl.set("#${epId}-L-${ep.start}", {opacity:1}, 0);`);
  tw.push(`tl.set("#${epId}-U-${ep.start}", {opacity:1}, 0);`);
  for (const s of screenIds) {
    const c = camera(null, H[s]);
    tw.push(`tl.set("#${epId}-W-${s}", {x:${c.x}, y:${c.y}, scale:${c.s}}, 0);`);
  }
  let cur = ep.start;
  let cam = cam0;
  const camOf = { [ep.start]: cam0 };
  let prevHl = null, prevNote = null;
  let cursorShown = false;
  const cursorPos = { x: 1880, y: 1000 };
  states.forEach((s, k) => {
    let t = s.t;
    if (s.click) {
      const p = toScreen(cam, s.click);
      const at = r2(t + (s.click.at ?? 0.2));
      const moveStart = r2(Math.max(at - 1.0, t - 0.4));
      if (!cursorShown) {
        tw.push(`tl.set("#${epId}-cursor", {x:${cursorPos.x}, y:${cursorPos.y}}, ${r2(moveStart - 0.01)});`);
        cursorShown = true;
      }
      tw.push(`tl.to("#${epId}-cursor", {opacity:1, duration:0.2}, ${moveStart});`);
      tw.push(`tl.to("#${epId}-cursor", {x:${p.x - 6}, y:${p.y - 4}, duration:${r2(at - moveStart)}, ease:"power3.inOut"}, ${moveStart});`);
      tw.push(`tl.to("#${epId}-cursor", {scale:0.82, duration:0.1, ease:"power2.in", yoyo:true, repeat:1}, ${at});`);
      tw.push(`tl.set("#${epId}-ring-${s.i}-${s.sub}", {left:${p.x}, top:${p.y}}, 0);`);
      tw.push(`tl.fromTo("#${epId}-ring-${s.i}-${s.sub}", {opacity:0.9, scale:0.3}, {opacity:0, scale:1.8, duration:0.6, ease:"power2.out", immediateRender:false}, ${r2(at + 0.05)});`);
      tw.push(`tl.to("#${epId}-cursor", {opacity:0, duration:0.3}, ${r2(at + 0.7)});`);
      cursorPos.x = p.x; cursorPos.y = p.y;
      t = r2(at + 0.3);
    }
    const doSwitch = (to, at) => {
      tw.push(`tl.to("#${epId}-L-${cur}", {opacity:0, duration:0.35, ease:"power1.in"}, ${at});`);
      tw.push(`tl.to("#${epId}-U-${cur}", {opacity:0, duration:0.2}, ${at});`);
      tw.push(`tl.fromTo("#${epId}-L-${to}", {opacity:0, y:24}, {opacity:1, y:0, duration:0.45, ease:"power2.out", immediateRender:false}, ${r2(at + 0.1)});`);
      tw.push(`tl.to("#${epId}-U-${to}", {opacity:1, duration:0.2}, ${r2(at + 0.1)});`);
      cur = to;
      cam = camOf[to] || camera(null, H[to]);
    };
    if (s.via) {
      doSwitch(s.via.screen, t);
      t = r2(t + s.via.hold);
    }
    if (s.screen !== cur) {
      doSwitch(s.screen, t);
      t = r2(t + 0.55);
    }
    const target = camera(s.zoom, H[cur]);
    if (target.s !== cam.s || target.x !== cam.x || target.y !== cam.y) {
      tw.push(`tl.to("#${epId}-W-${cur}", {x:${target.x}, y:${target.y}, scale:${target.s}, duration:1.2, ease:"power3.inOut"}, ${t});`);
      cam = target;
      camOf[cur] = target;
      t = r2(t + 0.9);
    }
    if (prevHl !== null) { tw.push(`tl.to("#${epId}-hl-${prevHl}", {opacity:0, duration:0.25}, ${r2(s.t - 0.1)});`); prevHl = null; }
    if (prevNote !== null) { tw.push(`tl.to("#${epId}-note-${prevNote}", {opacity:0, y:-20, duration:0.3}, ${r2(s.t - 0.1)});`); prevNote = null; }
    if (s.hl) {
      tw.push(`tl.fromTo("#${epId}-hl-${k}", {opacity:0}, {opacity:1, duration:0.4, ease:"power2.out", immediateRender:false}, ${r2(t)});`);
      prevHl = k;
    }
    if (s.note) {
      tw.push(`tl.fromTo("#${epId}-note-${k}", {opacity:0, y:30}, {opacity:1, y:0, duration:0.6, ease:"expo.out", immediateRender:false}, ${r2(t + 0.2)});`);
      prevNote = k;
    }
    if (s.phonePush !== undefined) {
      const pt = r2(s.t + s.phonePush);
      tw.push(`tl.fromTo("#${epId}-mini", {opacity:0, x:120, rotation:6}, {opacity:1, x:0, rotation:0, duration:0.8, ease:"power3.out", immediateRender:false}, ${pt});`);
      tw.push(`tl.fromTo("#${epId}-mnotif", {opacity:0, y:-40, scale:0.9}, {opacity:1, y:0, scale:1, duration:0.6, ease:"back.out(1.8)", immediateRender:false}, ${r2(pt + 0.7)});`);
      const next = lines[s.i + 1];
      if (next) tw.push(`tl.to("#${epId}-mini", {opacity:0, x:120, duration:0.5, ease:"power2.in"}, ${r2(next.start + 0.4)});`);
    }
  });
  tw.push(captionTweens(epId, lines));
  return page(epId, duration, PAGE_CSS, body, tw.join("\n"));
}

// ---------- 실행 ----------
const only = process.argv.slice(2);
const all = ["ep00", "ep01", "ep02", "ep03", "ep04", "ep05", "ep06", "ep07"];
const summary = [];
for (const id of all) {
  if (only.length && !only.includes(id)) continue;
  let html;
  if (id === "ep00") html = introBody(id);
  else if (id === "ep07") html = outroBody(id);
  else html = EPISODES[id].mode === "worker" ? buildWorker(id, EPISODES[id]) : buildManager(id, EPISODES[id]);
  fs.writeFileSync(path.join(ROOT, "episodes", `${id}.html`), html);
  summary.push(`${id} ${beatTimes(id).duration}s`);
}
console.log(summary.join("\n"));
