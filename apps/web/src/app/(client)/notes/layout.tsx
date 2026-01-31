import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@quick-jot/auth";

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/sign-in");
  }

  return children;
}
