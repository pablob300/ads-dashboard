import { getClientByToken } from "@/lib/share-token";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  return NextResponse.json({ client });
}
