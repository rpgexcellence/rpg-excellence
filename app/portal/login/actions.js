"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

export async function signIn(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/portal");
}

export async function signUp(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/portal");
}
