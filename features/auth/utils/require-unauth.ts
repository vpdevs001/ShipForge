import { redirect } from "next/navigation";
import { getServerSession } from "./get-server-session";
import { DEFAULT_AUTH_CALLBACK } from "./index";

export async function requireUnAuth(redirectTo = DEFAULT_AUTH_CALLBACK) {
  const session = await getServerSession();

  if (session) {
    redirect(redirectTo);
  }
}
