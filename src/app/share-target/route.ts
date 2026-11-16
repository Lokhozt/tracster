/**
 * Reached only when the service worker did not catch the share (first share right after
 * installing, or an old install): the file cannot be kept, so /share asks to share again.
 * Relative Location: correct behind any proxy.
 */
export async function POST() {
  return new Response(null, { status: 303, headers: { Location: "/share?missed=1" } });
}

export async function GET() {
  return new Response(null, { status: 303, headers: { Location: "/share" } });
}
