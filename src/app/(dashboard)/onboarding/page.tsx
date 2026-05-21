import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await auth();
  const userId = (session?.user as { id: string } | undefined)?.id;

  const connections = userId
    ? await prisma.googleConnection.findMany({
        where: { userId },
        select: { id: true, googleEmail: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return <OnboardingClient connections={connections} />;
}
