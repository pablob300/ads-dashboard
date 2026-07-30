import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/integrations/google?error=access_denied", req.url)
    );
  }

  try {
    // Troca o code pelo access_token + refresh_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/google-ads/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Falha ao trocar código por token");
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Busca o email da conta Google conectada
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const userInfo = await userInfoRes.json();
    const googleEmail: string = userInfo.email;

    const userId = (session.user as { id: string }).id;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Salva ou atualiza a conexão
    // Se o Google não devolver um refresh_token novo (ex: consentimento já concedido antes),
    // preserva o refresh_token existente em vez de sobrescrever com vazio e quebrar a renovação automática.
    await prisma.googleConnection.upsert({
      where: { id: `${userId}_${googleEmail}`.replace(/[^a-z0-9]/gi, "_") },
      create: {
        id: `${userId}_${googleEmail}`.replace(/[^a-z0-9]/gi, "_"),
        userId,
        googleEmail,
        accessToken: access_token,
        refreshToken: refresh_token ?? "",
        expiresAt,
        scope: "adwords userinfo.email userinfo.profile",
      },
      update: {
        accessToken: access_token,
        expiresAt,
        ...(refresh_token ? { refreshToken: refresh_token } : {}),
      },
    });

    return NextResponse.redirect(
      new URL("/integrations/google?success=connected", req.url)
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/integrations/google?error=token_exchange", req.url)
    );
  }
}
