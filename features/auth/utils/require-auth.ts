import { redirect } from "next/navigation";
import { getServerSession } from "./get-server-session";
import { SIGN_IN_PATH } from "./index";

export async function requireAuth(redirectTo = SIGN_IN_PATH) {
  const session = await getServerSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}
