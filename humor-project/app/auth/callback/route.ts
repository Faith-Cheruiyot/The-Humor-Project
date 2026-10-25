import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let destination = new URL("/profile", requestUrl.origin);
      try { destination = new URL(requestUrl.searchParams.get("next") || "/profile", requestUrl.origin); }
      catch { /* Fall back to the profile for malformed return URLs. */ }
      return NextResponse.redirect(destination.origin === requestUrl.origin ? destination : new URL("/profile", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
