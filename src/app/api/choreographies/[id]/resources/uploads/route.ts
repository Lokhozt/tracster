import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  isAllowedChoreographyResourceMimeType,
  safeResourceFileName,
} from "@/lib/choreography-resources";
import { prisma } from "@/lib/db";
import { canEditChoreography } from "@/lib/permissions";
import {
  choreographyResourceObjectKey,
  createChoreographyResourceUploadUrl,
} from "@/lib/s3";
import { choreographyResourceUploadSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!(await canEditChoreography(id, user.id))) return forbidden();

  const parsed = choreographyResourceUploadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  if (!isAllowedChoreographyResourceMimeType(parsed.data.mimeType)) {
    return jsonError("This file type is not supported.");
  }

  const resourceId = randomUUID();
  const fileName = safeResourceFileName(parsed.data.fileName);
  const storageKey = choreographyResourceObjectKey(id, resourceId, fileName);

  await prisma.choreographyResource.create({
    data: {
      id: resourceId,
      choreographyId: id,
      uploadedById: user.id,
      type: "FILE",
      status: "PENDING",
      visibility: parsed.data.visibility,
      description: parsed.data.description || null,
      storageKey,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: BigInt(parsed.data.sizeBytes),
    },
  });

  try {
    const uploadUrl = await createChoreographyResourceUploadUrl({
      key: storageKey,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    });
    return Response.json(
      {
        resourceId,
        uploadUrl,
        headers: { "Content-Type": parsed.data.mimeType },
      },
      { status: 201 },
    );
  } catch {
    await prisma.choreographyResource.delete({ where: { id: resourceId } });
    return jsonError("File storage is unavailable.", 503);
  }
}
