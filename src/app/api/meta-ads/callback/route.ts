import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeLongLivedToken, getMetaUserInfo } from "@/lib/meta-ads";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/integrations/meta?error=access_denied", req.url)
    );
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta-ads/callback`;

    // Troca code por short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", process.env.META_APP_ID!);
    tokenUrl.searchParams.set("client_secret", process.env.META_APP_SECRET!);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    if (!tokenRes.ok) throw new Error("Falha ao trocar código por token");
    const { access_token: shortToken } = await tokenRes.json();

    // Troca por token longo (60 dias)
    const { access_token, expires_in } = await exchangeLongLivedToken(shortToken);
    const expiresAt = new Date(Date.now() + (expires_in ?? 5184000) * 1000);

    // Busca dados do usuário Meta
    const userInfo = await getMetaUserInfo(access_token);
    const userId = (session.user as { id: string }).id;

    // Salva ou atualiza conexão
    await prisma.metaConnection.upsert({
      where: { userId_metaUserId: { userId, metaUserId: userInfo.id } },
      create: {
        userId,
        metaUserId: userInfo.id,
        metaName: userInfo.name,
        metaEmail: userInfo.email ?? null,
        accessToken: access_token,
        expiresAt,
        scope: "ads_read,ads_management",
      },
      update: {
        metaName: userInfo.name,
        metaEmail: userInfo.email ?? null,
        accessToken: access_token,
        expiresAt,
      },
    });

    return NextResponse.redirect(
      new URL("/integrations/meta?success=connected", req.url)
    );
  } catch (err) {
    console.error("Meta OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/integrations/meta?error=token_exchange", req.url)
    );
  }
}
