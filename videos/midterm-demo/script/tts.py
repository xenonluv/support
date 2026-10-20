"""Generate one mp3 per narration line with edge-tts and write durations to assets/vo/timing.json."""
import asyncio, json, subprocess, sys
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / "script/narration.json").read_text(encoding="utf-8"))
out = ROOT / "assets/vo"
only = set(sys.argv[1:])

def duration(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)

async def main():
    timing_path = out / "timing.json"
    timing = json.loads(timing_path.read_text(encoding="utf-8")) if timing_path.exists() else {}
    for ep, lines in cfg["episodes"].items():
        if only and ep not in only:
            continue
        rows = []
        for i, text in enumerate(lines):
            f = out / f"{ep}_{i:02d}.mp3"
            await edge_tts.Communicate(text, cfg["voice"], rate=cfg["rate"]).save(str(f))
            rows.append({"file": f"assets/vo/{f.name}", "text": text, "dur": duration(f)})
        timing[ep] = rows
        print(ep, sum(r["dur"] for r in rows))
    timing_path.write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")

asyncio.run(main())
