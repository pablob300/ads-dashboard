import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateTempPassword, sendTempPasswordEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email } });

    // Responde igual mesmo se o e-mail não existir (evita enumeração)
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: true },
    });

    await sendTempPasswordEmail(email, user.name, tempPassword);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
