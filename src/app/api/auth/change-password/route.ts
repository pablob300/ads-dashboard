import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const { password } = schema.parse(await req.json());

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("[change-password]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
