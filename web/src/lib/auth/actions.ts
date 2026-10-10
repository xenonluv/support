"use server";

import { redirect } from "next/navigation";
import { HOME, roleFromMetadata } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "이메일 또는 비밀번호가 맞지 않습니다." };

  const role = roleFromMetadata(data.user.app_metadata);
  if (!role) {
    await supabase.auth.signOut();
    return { error: "아직 역할이 지정되지 않은 계정입니다. 기관 담당자에게 문의해 주세요." };
  }
  redirect(HOME[role]);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
