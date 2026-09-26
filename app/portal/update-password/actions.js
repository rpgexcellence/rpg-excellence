"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

export async function updatePassword(formData) {
  const password = String(formData.get("password") || "");
  const confirmation = String(
    formData.get("password_confirmation") || ""
  );

  if (password.length < 8) {
    redirect(
      "/portal/update-password?error=Password must contain at least 8 characters."
    );
  }

  if (password !== confirmation) {
    redirect(
      "/portal/update-password?error=The passwords do not match."
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/portal/login?error=The recovery link has expired. Request a new password reset."
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      `/portal/update-password?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.auth.signOut();
  redirect(
    "/portal/login?message=Password updated successfully. Sign in with your new password."
  );
}
