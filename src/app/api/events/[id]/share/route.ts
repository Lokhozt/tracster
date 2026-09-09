import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { forbidden, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditEvent } from "@/lib/events";

type RouteContext = { params: Promise<{ id: string }> };

function shareUrl(request: NextRequest, token: string) {
  return new URL(`/share/events/${token}`, request.nextUrl.origin).toString();
}

async function getEditableEvent(id: string, userId: string) {
  if (!(await canEditEvent(id, userId))) {
    return null;
  }
  return prisma.event.findUnique({
    where: { id },
    select: { id: true, shareToken: true },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const event = await getEditableEvent(id, user.id);
  if (!event) {
    return (await prisma.event.findUnique({ where: { id }, select: { id: true } }))
      ? forbidden()
      : notFound("Event");
  }

  return Response.json({
    url: event.shareToken ? shareUrl(request, event.shareToken) : null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const event = await getEditableEvent(id, user.id);
  if (!event) {
    return (await prisma.event.findUnique({ where: { id }, select: { id: true } }))
      ? forbidden()
      : notFound("Event");
  }

  let token = event.shareToken;
  if (!event.shareToken) {
    const proposedToken = randomBytes(32).toString("base64url");
    await prisma.event.updateMany({
      where: { id, shareToken: null },
      data: { shareToken: proposedToken },
    });
    token = (
      await prisma.event.findUniqueOrThrow({
        where: { id },
        select: { shareToken: true },
      })
    ).shareToken;
  }

  if (!token) {
    throw new Error("Failed to create event share link.");
  }
  return Response.json({ url: shareUrl(request, token) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const event = await getEditableEvent(id, user.id);
  if (!event) {
    return (await prisma.event.findUnique({ where: { id }, select: { id: true } }))
      ? forbidden()
      : notFound("Event");
  }

  await prisma.event.update({
    where: { id },
    data: { shareToken: null },
  });

  return Response.json({ ok: true });
}
