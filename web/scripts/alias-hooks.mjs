// 관리 스크립트(.mts)에서 앱 코드의 "@/..." 경로(tsconfig paths)를 쓰게 한다.
// 실행: node --import ./scripts/alias-hooks.mjs scripts/xxx.mts
import { registerHooks } from "node:module";

const src = new URL("../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), src).href;
      for (const suffix of [".ts", ".tsx", "/index.ts"]) {
        try {
          return nextResolve(base + suffix, context);
        } catch {
          // 다음 확장자를 시도한다
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
