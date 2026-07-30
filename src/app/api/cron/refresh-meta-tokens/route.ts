import { prisma } from "@/lib/prisma";
import { exchangeLongLivedToken } from "@/lib/meta-ads";
import { NextRequest, NextResponse } from "next/server";

const REFRESH_THRESHOLD_DAYS = 10;

/**
 * Renova tokens Meta que estão perto de expirar (long-lived, 60 dias, sem refresh_token nativo).
 * A Graph API permite trocar um token long-lived ainda válido por um novo com mais 60 dias,
 * sem o usuário reautorizar — mas precisa ser feito antes do vencimento. Disparado por Vercel Cron.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const threshold = new Date(Date.now() + REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const connections = await prisma.metaConnection.findMany({
    where: { expiresAt: { lt: threshold } },
  });

  const results = await Promise.all(
    connections.map(async (conn) => {
      try {
        const { access_token, expires_in } = await exchangeLongLivedToken(conn.accessToken);
        await prisma.metaConnection.update({
          where: { id: conn.id },
          data: {
            accessToken: access_token,
            expiresAt: new Date(Date.now() + (expires_in ?? 5184000) * 1000),
          },
        });
        return { id: conn.id, metaName: conn.metaName, status: "renewed" };
      } catch (err) {
        console.error(`Falha ao renovar token Meta (conexão ${conn.id}):`, err);
        return {
          id: conn.id,
          metaName: conn.metaName,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  return NextResponse.json({ checked: connections.length, results });
}
