import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientDashboard from "./client-dashboard";

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, userId },
    include: {
      googleAdAccounts: {
        select: { id: true, customerId: true, descriptiveName: true, alias: true },
      },
      metaAdAccounts: {
        select: { id: true, accountId: true, name: true, alias: true },
      },
    },
  });

  if (!client) redirect("/clients");

  return (
    <Suspense>
      <ClientDashboard client={client} />
    </Suspense>
  );
}
