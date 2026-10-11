import { z } from "zod";

// 대상자 입력 — 식별번호·연령대·동만 받는다. 다른 칸(성명·주소·연락처)이 있으면 거부한다(개인정보 규칙).
// DB 함수(register_client·update_client)도 같은 규칙을 한 번 더 확인한다.

export const AGENCY_TYPES = ["dong_center", "provider", "welfare_center"] as const;
export type AgencyType = (typeof AGENCY_TYPES)[number];
export const AGENCY_TYPE_LABEL: Record<AgencyType, string> = {
  dong_center: "동 행정복지센터",
  provider: "수행기관",
  welfare_center: "복지관",
};

/** 연령대 선택지 (연령대 시작값, 100은 100세 이상) */
export const AGE_BANDS = [50, 60, 70, 80, 90, 100] as const;

export const ClientCodeSchema = z.string().trim().regex(/^C-\d{4}$/, "식별번호는 C-숫자4자리");
export const AgeBandSchema = z.number().int().min(50).max(100).multipleOf(10, "연령대는 10 단위 (예: 80)").nullable();
/**
 * 행정동 이름만 받는다 (예: 서구 화정1동, 광주광역시 서구 화정1동, ○○동, 담양군 대전면).
 * 주소·전화번호·이름을 섞어 넣지 못하게 한다 — 이 값은 여러 기관 화면과 AI 요청에 함께 나간다.
 * DB 제약(clients_dong_format)도 같은 규칙이다.
 */
export const DONG_PATTERN = /^(?:[가-힣○]{1,8}(?:시|구|군) ){0,2}[가-힣○0-9·]{1,12}(?:동|읍|면|가)$/;
export const DongSchema = z.string().trim().min(2).max(40).regex(DONG_PATTERN, "동 이름만 적어 주세요 (예: 서구 화정1동)");

/** 동 담당자의 대상자 등록. 번호를 비우면 다음 번호가 자동으로 붙는다. */
export const ClientRegisterSchema = z.strictObject({
  code: z.union([z.literal(""), ClientCodeSchema]),
  ageBand: AgeBandSchema,
  dong: DongSchema,
  /** 내 기관 말고 함께 돌볼 기관 */
  partnerAgencyIds: z.array(z.uuid()),
});
export type ClientRegisterInput = z.infer<typeof ClientRegisterSchema>;

export const ClientUpdateSchema = z.strictObject({
  clientId: z.uuid(),
  code: ClientCodeSchema,
  ageBand: AgeBandSchema,
  dong: DongSchema,
  partnerAgencyIds: z.array(z.uuid()),
});
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;

export const ClientClosedSchema = z.strictObject({ clientId: z.uuid(), closed: z.boolean() });
