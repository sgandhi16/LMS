import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getVideoProvider } from "@/lib/video";
import { getUploadUrlSchema, createVideoSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);

  // If action is requesting a presigned upload URL
  if (body?.action === "get-upload-url") {
    const parsed = getUploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
    }

    const { moduleId, fileName, mimeType } = parsed.data;
    const ext = fileName.split(".").pop();
    const key = `videos/${moduleId}/${Date.now()}.${ext}`;

    try {
      const provider = getVideoProvider();
      const { uploadUrl } = await provider.getUploadUrl(key, mimeType);
      return NextResponse.json({ uploadUrl, storageKey: key });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get upload URL";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Otherwise, create or update the Video record in DB
  const parsed = createVideoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const { moduleId, provider, storageKey, externalUrl, durationSec, mimeType } = parsed.data;

  const video = await db.video.upsert({
    where: { moduleId },
    create: {
      moduleId,
      provider,
      storageKey: storageKey ?? null,
      externalUrl: externalUrl ?? null,
      durationSec: durationSec ?? 600,
      mimeType: mimeType ?? "video/mp4",
      isReady: true,
    },
    update: {
      provider,
      storageKey: storageKey ?? null,
      externalUrl: externalUrl ?? null,
      durationSec: durationSec ?? 600,
      mimeType: mimeType ?? "video/mp4",
      isReady: true,
    },
  });

  return NextResponse.json({ video });
}
