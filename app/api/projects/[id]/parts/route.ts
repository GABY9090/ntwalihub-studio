import { NextResponse } from "next/server";
import { currentUser, ownProject } from "@/lib/auth";
import { createPart } from "@/lib/parts";
import { getDict } from "@/lib/lang";

// Ajoute la partie suivante de la série (partie 2, 3...)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getDict();
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t.errLogin }, { status: 401 });
  if (!(await ownProject(id, user.id))) return NextResponse.json({ error: t.errServer }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const fail = await createPart({
    projectId: id, userId: user.id, prompt: String(body.prompt ?? "").trim(),
    seconds: Number(body.seconds ?? 5), t,
  });
  if (fail) return NextResponse.json({ error: fail.error }, { status: fail.status });
  return NextResponse.json({ ok: true });
}
