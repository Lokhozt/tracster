import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const STATIC_PREFIX = "static/";
const RESOURCE_PREFIX = "ressources/choreographies/";

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

function getConfiguredS3() {
  const config = getS3Config();
  if (!config) {
    throw new Error("S3 storage is not configured.");
  }
  return { config, client: getS3Client(config) };
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

export function choreographyResourceObjectKey(
  choreographyId: string,
  resourceId: string,
  fileName: string,
) {
  if (
    !/^[A-Za-z0-9_-]+$/.test(choreographyId) ||
    !/^[A-Za-z0-9_-]+$/.test(resourceId) ||
    !/^[A-Za-z0-9._-]+$/.test(fileName)
  ) {
    throw new Error("Invalid resource object key.");
  }
  return `${RESOURCE_PREFIX}${choreographyId}/${resourceId}/${fileName}`;
}

export async function createChoreographyResourceUploadUrl(options: {
  key: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { config, client } = getConfiguredS3();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: options.key,
      ContentType: options.mimeType,
      ContentLength: options.sizeBytes,
    }),
    { expiresIn: 15 * 60 },
  );
}

export async function headChoreographyResourceObject(key: string) {
  const { config, client } = getConfiguredS3();
  const response = await client.send(
    new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
  );
  return {
    contentType: response.ContentType ?? "application/octet-stream",
    contentLength: response.ContentLength ?? 0,
  };
}

export async function createChoreographyResourceDownloadUrl(options: {
  key: string;
  fileName: string;
  mimeType: string;
  disposition?: "inline" | "attachment";
}) {
  const { config, client } = getConfiguredS3();
  const safeFileName = options.fileName.replace(/["\\]/g, "_");
  const disposition = options.disposition ?? "inline";
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: options.key,
      ResponseContentType: options.mimeType,
      ResponseContentDisposition: `${disposition}; filename="${safeFileName}"`,
    }),
    { expiresIn: 15 * 60 },
  );
}

export async function deleteChoreographyResourceObjects(keys: string[]) {
  if (keys.length === 0) return;
  const { config, client } = getConfiguredS3();
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
    if (response.Errors?.length) {
      throw new Error(
        `Could not delete ${response.Errors.length} resource object(s) from S3.`,
      );
    }
  }
}

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
