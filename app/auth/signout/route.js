import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL("/portal/login", request.url),
    303
  );
}
