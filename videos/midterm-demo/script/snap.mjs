// 편 하나를 index.html로 올리고, 문장마다 70% 지점 장면을 찍는다. 실행: node script/snap.mjs ep01 [출력폴더]
import fs from "node:fs";
import { execSync } from "node:child_process";
const ep = process.argv[2];
const out = process.argv[3] || `.hyperframes/snap-${ep}`;
const timing = JSON.parse(fs.readFileSync("assets/vo/timing.json", "utf8"))[ep];
const LEAD = 1.4, GAP = 0.5;
let t = LEAD; const at = [];
for (const l of timing) { at.push((t + l.dur * 0.7).toFixed(2)); t += l.dur + GAP; }
fs.copyFileSync(`episodes/${ep}.html`, "index.html");
execSync(`npx hyperframes snapshot --at ${at.join(",")} --no-end -o "${out}" --describe false`, { stdio: "inherit" });
