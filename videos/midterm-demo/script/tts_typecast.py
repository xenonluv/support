"""Typecast API로 내레이션 문장별 mp3를 만들고 assets/vo/timing.json을 갱신한다.

API 키: 환경변수 TYPECAST_API_KEY 또는 프로젝트 폴더의 .env.typecast (TYPECAST_API_KEY=...)
사용:
  python script/tts_typecast.py voices                 # 쓸 수 있는 목소리 목록
  python script/tts_typecast.py sample <voice_id>      # 첫 문장으로 들어 보기 → assets/vo/sample_<voice_id>.mp3
  python script/tts_typecast.py make <voice_id> [ep..] # 전체(또는 지정한 편) 생성
"""
import json, os, subprocess, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.typecast.ai"
MODEL = "ssfm-v30"


def api_key():
    key = os.environ.get("TYPECAST_API_KEY")
    f = ROOT / ".env.typecast"
    if not key and f.exists():
        for line in f.read_text(encoding="utf-8-sig").splitlines():
            if line.strip().startswith("TYPECAST_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"')
    if not key:
        sys.exit("API 키가 없습니다. .env.typecast 파일에 TYPECAST_API_KEY=... 를 적어 주세요.")
    return key


def request(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={"X-API-KEY": api_key(), "Content-Type": "application/json"},
                                 method="POST" if body else "GET")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def speak(text, voice, out, prev="", nxt=""):
    body = {"text": text, "model": MODEL, "voice_id": voice,
            "prompt": {"emotion_type": "smart", "previous_text": prev, "next_text": nxt},
            "output": {"audio_format": "mp3", "audio_tempo": 1.0}}
    out.write_bytes(request("/v1/text-to-speech", body))


def duration(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    cfg = json.loads((ROOT / "script/narration.json").read_text(encoding="utf-8"))
    if cmd == "voices":
        voices = json.loads(request(f"/v3/voices?model={MODEL}"))
        for v in voices if isinstance(voices, list) else voices.get("voices", voices):
            name = v.get("voice_name", {})
            print(v.get("voice_id"), "|", name.get("kor") if isinstance(name, dict) else name, "|", v.get("gender"), v.get("age"), v.get("use_cases"))
        return
    if cmd == "sample":
        text = cfg["episodes"]["ep00"][0]
        out = ROOT / f"assets/vo/sample_{sys.argv[2]}.mp3"
        speak(text, sys.argv[2], out)
        print(out, duration(out))
        return
    if cmd == "make":
        voice, only = sys.argv[2], set(sys.argv[3:])
        tp = ROOT / "assets/vo/timing.json"
        timing = json.loads(tp.read_text(encoding="utf-8"))
        for ep, lines in cfg["episodes"].items():
            if only and ep not in only:
                continue
            rows = []
            for i, text in enumerate(lines):
                f = ROOT / f"assets/vo/{ep}_{i:02d}.mp3"
                speak(text, voice, f, lines[i - 1] if i else "", lines[i + 1] if i + 1 < len(lines) else "")
                rows.append({"file": f"assets/vo/{f.name}", "text": text, "dur": duration(f)})
            timing[ep] = rows
            print(ep, round(sum(r["dur"] for r in rows), 1))
        tp.write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
        return
    print(__doc__)


main()
