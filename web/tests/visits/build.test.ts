import { describe, expect, it } from "vitest";
import { buildVisitCards, type VisitClient } from "@/lib/visits/build";

const ME = "worker-me";
const clients: VisitClient[] = [
  { id: "c1", code: "C-0012", ageBand: 80, dong: "서구 화정1동" },
  { id: "c2", code: "C-0047", ageBand: null, dong: "서구 화정1동" },
];

describe("오늘의 방문 카드", () => {
  it("최근 방문은 누가 다녀왔든 가장 최근 기록이다", () => {
    const cards = buildVisitCards(
      clients,
      [
        { clientId: "c1", visitedAt: "2026-10-09T01:00:00+00:00", workerId: ME },
        { clientId: "c1", visitedAt: "2026-10-10T01:00:00+00:00", workerId: "other-agency-worker" },
        { clientId: "c2", visitedAt: "2026-10-08T01:00:00+00:00", workerId: ME },
      ],
      [],
      ME,
    );
    expect(cards[0]).toMatchObject({ code: "C-0012", lastVisitedAt: "2026-10-10T01:00:00+00:00" });
    expect(cards[1]).toMatchObject({ code: "C-0047", lastVisitedAt: "2026-10-08T01:00:00+00:00" });
  });

  it("내가 쓴 기록 수는 최근 방문이 남의 기록이어도 센다", () => {
    const cards = buildVisitCards(
      clients,
      [
        { clientId: "c1", visitedAt: "2026-10-08T01:00:00+00:00", workerId: ME },
        { clientId: "c1", visitedAt: "2026-10-09T01:00:00+00:00", workerId: ME },
        { clientId: "c1", visitedAt: "2026-10-10T01:00:00+00:00", workerId: "other-agency-worker" },
        { clientId: "c2", visitedAt: "2026-10-10T01:00:00+00:00", workerId: "other-agency-worker" },
      ],
      [],
      ME,
    );
    expect(cards[0]).toMatchObject({ lastVisitedAt: "2026-10-10T01:00:00+00:00", myRecords: 2 });
    expect(cards[1]).toMatchObject({ myRecords: 0 });
  });

  it("기록이 없는 대상자는 최근 방문 없음", () => {
    const [card] = buildVisitCards(clients, [], [], ME);
    expect(card).toMatchObject({ lastVisitedAt: null, myRecords: 0, openSignals: 0, caution: false });
  });

  it("해소 안 된 신호는 종류 수로 세고, 주의 등급이 하나라도 있으면 주의로 표시한다", () => {
    const cards = buildVisitCards(
      clients,
      [],
      [
        { clientId: "c1", type: "reduced_meal", level: "observe" },
        { clientId: "c1", type: "reduced_meal", level: "observe" },
        { clientId: "c1", type: "fall", level: "caution" },
        { clientId: "c2", type: "visit_refusal", level: "observe" },
      ],
      ME,
    );
    expect(cards[0]).toMatchObject({ openSignals: 2, caution: true });
    expect(cards[1]).toMatchObject({ openSignals: 1, caution: false });
  });

  it("대상자 순서(번호순)를 그대로 둔다", () => {
    const cards = buildVisitCards(clients, [{ clientId: "c2", visitedAt: "2026-10-10T01:00:00+00:00", workerId: ME }], [], ME);
    expect(cards.map((c) => c.code)).toEqual(["C-0012", "C-0047"]);
  });
});
