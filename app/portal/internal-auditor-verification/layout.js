import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { requirePlanAccess } from "../../../lib/plan-access";
export default async function Layout({children}){const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)redirect("/portal/login");await requirePlanAccess(user,"professional","Internal Auditor Verification");return children;}
