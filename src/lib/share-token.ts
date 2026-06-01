import { prisma } from "./prisma";

export interface SharedClient {
  id: string;
  name: string;
  googleAdAccounts: { id: string; connectionId: string; customerId: string; descriptiveName: string; alias: string | null }[];
  metaAdAccounts: { id: string; connectionId: string; accountId: string; name: string; alias: string | null }[];
}

export async function getClientByToken(token: string): Promise<SharedClient | null> {
  try {
    const share = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        client: {
          include: {
            googleAdAccounts: { select: { id: true, connectionId: true, customerId: true, descriptiveName: true, alias: true } },
            metaAdAccounts: { select: { id: true, connectionId: true, accountId: true, name: true, alias: true } },
          },
        },
      },
    });
    if (!share) return null;
    if (share.expiresAt && share.expiresAt < new Date()) return null;
    return share.client;
  } catch {
    return null;
  }
}
