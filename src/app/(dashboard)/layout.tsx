import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as { mustChangePassword?: boolean }).mustChangePassword) redirect("/change-password");

  return (
    <DashboardShell user={session.user}>
      {children}
    </DashboardShell>
  );
}
