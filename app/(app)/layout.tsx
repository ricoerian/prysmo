import { getSession } from "@/app/_lib/auth";
import { redirect } from "next/navigation";
import AppShell from "./_components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
