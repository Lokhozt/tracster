import { NextRequest } from "next/server";
import { forbidden, jsonError, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canManageDocuments,
  listActiveDocuments,
  listDocumentCategories,
  resolveDocumentCategory,
  serializeDocument,
} from "@/lib/documents";
import { documentLinkSchema } from "@/lib/validations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [documents, categories] = await Promise.all([
    listActiveDocuments(),
    listDocumentCategories(),
  ]);
  return Response.json({ documents, categories });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!(await canManageDocuments(user.id))) return forbidden();

  const parsed = documentLinkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const category = await resolveDocumentCategory(parsed.data);
  if (!category) return jsonError("Choose a valid document category.");

  const document = await prisma.document.create({
    data: {
      uploadedById: user.id,
      categoryId: category.id,
      type: "LINK",
      title: parsed.data.title,
      description: parsed.data.description || null,
      url: parsed.data.url,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  return Response.json({ document: serializeDocument(document) }, { status: 201 });
}
