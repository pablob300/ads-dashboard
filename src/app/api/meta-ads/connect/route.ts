import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.redirect(
      new URL("/integrations/meta?error=not_configured", req.url)
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta-ads/callback`;
  const scope = "ads_read,ads_management";

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
