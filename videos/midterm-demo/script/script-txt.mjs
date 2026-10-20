// 영상 시간표에 맞춘 낭독용 대본(txt)을 만든다. 실행: node script/script-txt.mjs <출력 파일>
import fs from "node:fs";
import { EPISODES } from "./episodes.mjs";
const timing = JSON.parse(fs.readFileSync("assets/vo/timing.json", "utf8"));
const LEAD = 1.4, GAP = 0.5, TAIL = 1.6;
const TITLES = {
  ep00: "인트로", ep01: "현장인력 ① 오늘의 방문과 대상자 상황", ep02: "현장인력 ② 30초 구술로 기록 초안 만들기",
  ep03: "현장인력 ③ 내 기록과 관리자 알림 받기", ep04: "관리자 ① 이상징후 현황과 현장 알림", ep05: "관리자 ② 인수인계 브리핑",
  ep06: "관리자 ③ 대상자 관리와 성과 지표", ep07: "마무리",
};
const BOOK = {
  ep00: ["제목 화면", "제안의 배경 (기관별로 흩어진 기록)", "30초 구술 → 산출물 3종", "현장인력 모드 · 관리자 모드 소개"],
  ep07: ["지금 동작하는 기능 4가지", "운영 원칙", "남은 기간 · 파일럿 목표", "감사합니다"],
};
const ts = (s) => { const m = Math.floor(s / 60); const r = s - m * 60; return `${String(m).padStart(2, "0")}:${r.toFixed(1).padStart(4, "0")}`; };
let out = [], n = 0, offset = 0, totalChars = 0, totalSpeech = 0;
const eps = Object.keys(timing);
for (const ep of eps) {
  const lines = timing[ep];
  let t = LEAD;
  const rows = lines.map((l, i) => { const r = { start: t, end: t + l.dur, dur: l.dur, text: l.text, i }; t += l.dur + GAP; return r; });
  const epDur = t - GAP + (ep === "ep07" ? TAIL + 2 : TAIL);
  out.push("", "=".repeat(72), `[${ep.slice(2)}편] ${TITLES[ep]}   (영상 길이 ${epDur.toFixed(1)}초 · 전체판 ${ts(offset)} ~ ${ts(offset + epDur)})`, "=".repeat(72));
  for (const r of rows) {
    n++;
    const chars = r.text.replace(/\s/g, "").length;
    totalChars += chars; totalSpeech += r.dur;
    const label = EPISODES[ep]?.beats[r.i]?.step ?? BOOK[ep]?.[r.i] ?? "";
    out.push("", `${String(n).padStart(2, "0")}. [화면: ${label}]`,
      `    시간 ${ts(r.start)} ~ ${ts(r.end)}  (${r.dur.toFixed(1)}초, ${chars}자)   전체판 ${ts(offset + r.start)}`,
      `    ${r.text}`);
  }
  offset += epDur;
}
const head = [
  "돌봄이음 중간보고 영상 낭독 대본",
  "",
  "읽는 법",
  `- 문장 번호 순서대로 읽습니다. 모두 ${n}문장, 전체판 ${ts(offset)} (낭독 ${totalSpeech.toFixed(0)}초).`,
  "- '시간'은 각 편 영상 안에서 그 문장이 나오는 구간입니다. 자막과 화면 전환이 이 구간에 맞춰져 있습니다.",
  "- 각 편은 1.4초 뒤에 첫 문장이 시작되고, 문장 사이에는 0.5초씩 쉽니다.",
  `- 정해진 길이 안에 맞추려면 초당 약 ${(totalChars / totalSpeech).toFixed(1)}자(공백 제외) 속도로 읽으면 됩니다. 아나운서보다 조금 빠른 보통 발표 속도입니다.`,
  "- 조금 길어져도 괜찮습니다. 문장마다 따로 녹음해 보내 주시면, 실제 길이에 맞춰 화면과 자막 시간을 다시 계산합니다.",
];
fs.writeFileSync(process.argv[2], "\uFEFF" + [...head, ...out, ""].join("\r\n"), "utf8");
console.log(n, "lines", ts(offset));
