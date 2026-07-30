import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MetaOnboardingClient from "./meta-onboarding-client";

export default async function MetaIntegrationPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;

  const connections = userId
    ? await prisma.metaConnection.findMany({
        where: { userId },
        select: { id: true, metaName: true, metaEmail: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const configured = !!(process.env.META_APP_ID && process.env.META_APP_SECRET);

  return <MetaOnboardingClient connections={connections} configured={configured} />;
}
