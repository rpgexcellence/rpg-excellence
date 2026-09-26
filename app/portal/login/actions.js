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

export async function requestPasswordReset(formData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const next = safeNext(formData.get("next"));

  const recoveryError = (message) => {
    const query = new URLSearchParams({
      error: message,
      next,
    });
    redirect(`/portal/forgot-password?${query.toString()}`);
  };

  if (!email) {
    recoveryError("Enter your email address before requesting password recovery.");
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.rpgexcellence.com";

  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set(
    "next",
    "/portal/update-password"
  );

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    { redirectTo: callback.toString() }
  );

  if (error) {
    recoveryError("Password recovery could not be started. Please try again.");
  }

  const query = new URLSearchParams({
    message:
      "If the email is registered, a secure password-reset link has been sent.",
    next,
  });
  redirect(`/portal/login?${query.toString()}`);
}

async function signInWithProvider(formData, provider, scopes) {
  const supabase=await createClient(),next=safeNext(formData.get("next")),requestHeaders=await headers();
  const origin=requestHeaders.get("origin")||process.env.NEXT_PUBLIC_SITE_URL||"https://www.rpgexcellence.com";
  const callback=new URL("/auth/callback",origin);callback.searchParams.set("next",next);
  const options={redirectTo:callback.toString(),...(scopes?{scopes}:{})};
  const {data,error}=await supabase.auth.signInWithOAuth({provider,options});
  if(error||!data?.url)loginError(error?.message||"Social sign-in is not available. Please try email access.",next);
  redirect(data.url);
}

export async function signInWithApple(formData) {
  return signInWithProvider(formData,"apple");
}

export async function signInWithGoogle(formData) {
  return signInWithProvider(formData,"google");
}

export async function signInWithMicrosoft(formData) {
  return signInWithProvider(formData,"azure","openid email profile");
}
