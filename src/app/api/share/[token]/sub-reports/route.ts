import { getClientByToken } from "@/lib/share-token";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = await getClientByToken(token);
    if (!client) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });

    const channel = req.nextUrl.searchParams.get("channel") ?? undefined;
    const subReports = await prisma.subReport.findMany({
      where: { clientId: client.id, ...(channel ? { channel } : {}) },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ subReports });
  } catch (err) {
    console.error("share sub-reports error:", err);
    return NextResponse.json({ error: "Erro ao buscar sub-relatórios." }, { status: 500 });
  }
}
