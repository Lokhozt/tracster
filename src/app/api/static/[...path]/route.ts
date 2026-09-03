import { NoSuchKey, S3ServiceException } from "@aws-sdk/client-s3";
import { getStaticObject, isS3Configured } from "@/lib/s3";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isS3Configured()) {
    return new Response("S3 is not configured.", { status: 503 });
  }

  const { path } = await context.params;
  const objectPath = path.join("/");

  try {
    const object = await getStaticObject(objectPath);
    if (!object) {
      return new Response("Not found.", { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": object.contentType,
      "Cache-Control": object.cacheControl,
    });
    if (object.etag) {
      headers.set("ETag", object.etag);
    }
    if (typeof object.contentLength === "number") {
      headers.set("Content-Length", String(object.contentLength));
    }

    return new Response(object.body, { headers });
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return new Response("Not found.", { status: 404 });
    }
    if (error instanceof S3ServiceException) {
      if (error.$metadata.httpStatusCode === 404 || error.name === "NoSuchKey") {
        return new Response("Not found.", { status: 404 });
      }
      return new Response("Failed to load file.", { status: 502 });
    }
    throw error;
  }
}
