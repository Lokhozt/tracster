import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const STATIC_PREFIX = "static/";

export type S3Config = {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function getS3Config(): S3Config | null {
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID?.trim() || process.env.ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY?.trim() ||
    process.env.SECRET_ACCESS_KEY?.trim();
  const endpoint =
    process.env.AWS_ENDPOINT_URL?.trim() || process.env.ENDPOINT?.trim();
  const bucket =
    process.env.AWS_S3_BUCKET_NAME?.trim() || process.env.BUCKET?.trim();
  const region =
    process.env.AWS_DEFAULT_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    process.env.REGION?.trim() ||
    "auto";
  const urlStyle = process.env.AWS_S3_URL_STYLE?.trim().toLowerCase();
  const forcePathStyle =
    process.env.AWS_S3_FORCE_PATH_STYLE === "true" || urlStyle === "path";

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    return null;
  }

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  };
}

export function isS3Configured() {
  return getS3Config() !== null;
}

let client: S3Client | undefined;
let clientSignature: string | undefined;

function getS3Client(config: S3Config) {
  const signature = JSON.stringify(config);
  if (!client || clientSignature !== signature) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    clientSignature = signature;
  }
  return client;
}

export function staticObjectKey(path: string) {
  const normalized = path.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!normalized || normalized.includes("..")) {
    return null;
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(normalized)) {
    return null;
  }
  return `${STATIC_PREFIX}${normalized}`;
}

export const APP_LOGO_OBJECT_PATH = "LOGO.png";
export const APP_LOGO_SRC = `/api/static/${APP_LOGO_OBJECT_PATH}`;

export async function getStaticObject(path: string) {
  const config = getS3Config();
  const key = staticObjectKey(path);
  if (!config || !key) {
    return null;
  }

  const response = await getS3Client(config).send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    return null;
  }

  return {
    body: response.Body.transformToWebStream(),
    contentType: response.ContentType ?? "application/octet-stream",
    cacheControl: response.CacheControl ?? "public, max-age=3600, s-maxage=86400",
    etag: response.ETag,
    contentLength: response.ContentLength,
  };
}
