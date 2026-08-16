import { createOrganization } from "./actions";
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/en");
}
