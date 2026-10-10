import { describe, expect, it } from "vitest";
import { maskPersonalInfo } from "@/lib/privacy/mask";

const mask = (t: string) => maskPersonalInfo(t).text;

describe("maskPersonalInfo", () => {
  it("성+이름 뒤에 어르신·할머니·씨·님이 오면 이름을 가린다", () => {
    expect(mask("김영희 어르신께서 혈압약을 안 드셨어요")).toBe("[이름] 어르신께서 혈압약을 안 드셨어요");
    expect(mask("박철수씨가 문을 열어 주셨다")).toBe("[이름]씨가 문을 열어 주셨다");
    expect(mask("이순자 할머니와 정 할아버지")).toBe("[이름] 할머니와 정 할아버지");
    expect(mask("남궁민수 님께 연락")).toBe("[이름] 님께 연락");
  });

  it("'오늘 어르신', '옆집 할머니' 같은 일반 낱말은 가리지 않는다", () => {
    expect(mask("오늘 어르신께서 점심을 거르셨어요")).toBe("오늘 어르신께서 점심을 거르셨어요");
    expect(mask("옆집 할머니가 들르셨다")).toBe("옆집 할머니가 들르셨다");
    expect(mask("이번 어르신 방문은 짧았다")).toBe("이번 어르신 방문은 짧았다");
  });

  it("전화번호·주민번호·이메일을 가린다", () => {
    expect(mask("아드님 번호 010-1234-5678로 연락")).toBe("아드님 번호 [전화번호]로 연락");
    expect(mask("01012345678 / 062-123-4567")).toBe("[전화번호] / [전화번호]");
    expect(mask("주민번호 400101-2345678 확인")).toBe("주민번호 [주민번호] 확인");
    expect(mask("메일 kim@example.com 으로")).toBe("메일 [이메일] 으로");
  });

  it("도로명·지번·동호수 주소를 가린다", () => {
    expect(mask("화정로 123번길 4에 사심")).toBe("[주소]에 사심");
    expect(mask("농성동 123-4번지 방문")).toBe("[주소] 방문");
    expect(mask("행복아파트 101동 1203호")).toBe("행복아파트 [주소]");
  });

  it("주소처럼 보여도 시간·횟수는 가리지 않는다", () => {
    expect(mask("산책길 30분 걸으셨음")).toBe("산책길 30분 걸으셨음");
    expect(mask("고혈압약 2일분 미복용, 70대")).toBe("고혈압약 2일분 미복용, 70대");
  });

  it("대상자 식별번호는 그대로 둔다", () => {
    expect(mask("C-0012 어르신 방문")).toBe("C-0012 어르신 방문");
  });

  it("가린 개수를 알려 주고, 여러 번 거쳐도 결과가 같다", () => {
    const once = maskPersonalInfo("김영희 어르신, 010-1234-5678");
    expect(once.count).toBe(2);
    expect(maskPersonalInfo(once.text)).toEqual({ text: once.text, count: 0 });
  });
});
