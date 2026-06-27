import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const endpoint = req.nextUrl.searchParams.get("endpoint") ?? undefined;

  const logs = await prisma.debugApiLog.findMany({
    where: { userId, ...(endpoint ? { endpoint } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const endpoint = req.nextUrl.searchParams.get("endpoint") ?? undefined;

  await prisma.debugApiLog.deleteMany({
    where: { userId, ...(endpoint ? { endpoint } : {}) },
  });

  return NextResponse.json({ ok: true });
}
