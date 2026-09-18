import {NextResponse} from "next/server";
import {createClient} from "../../../lib/supabase/server";
const safeNext=value=>{const next=String(value||"");return next.startsWith("/")&&!next.startsWith("//")?next:"/portal"};
export async function GET(request){const requestUrl=new URL(request.url),code=requestUrl.searchParams.get("code"),next=safeNext(requestUrl.searchParams.get("next"));if(code){const supabase=await createClient(),{error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,requestUrl.origin))}const login=new URL("/portal/login",requestUrl.origin);login.searchParams.set("error","We could not complete that sign-in. Please try again.");login.searchParams.set("next",next);return NextResponse.redirect(login)}
