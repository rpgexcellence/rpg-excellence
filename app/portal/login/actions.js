"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "../../../lib/supabase/server";

const safeNext=value=>{const next=String(value||"");return next.startsWith("/")&&!next.startsWith("//")?next:"/portal"};
const loginError=(message,next="/portal")=>{const query=new URLSearchParams({error:message,next:safeNext(next)});redirect(`/portal/login?${query.toString()}`)};

export async function signIn(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");
  const next = safeNext(formData.get("next"));

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginError(error.message,next);
  }

  redirect(next);
}

export async function signUp(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");
  const next = safeNext(formData.get("next"));

  if (!email || !password) loginError("Enter an email address and password before creating your account.",next);

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    loginError(error.message,next);
  }

  redirect(next);
}

export async function signInWithApple(formData) {
  const supabase=await createClient(),next=safeNext(formData.get("next")),requestHeaders=await headers();
  const origin=requestHeaders.get("origin")||process.env.NEXT_PUBLIC_SITE_URL||"https://www.rpgexcellence.com";
  const callback=new URL("/auth/callback",origin);callback.searchParams.set("next",next);
  const {data,error}=await supabase.auth.signInWithOAuth({provider:"apple",options:{redirectTo:callback.toString()}});
  if(error||!data?.url)loginError(error?.message||"Apple sign-in is not available. Please try email access.",next);
  redirect(data.url);
}
