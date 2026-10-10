import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const bucket = process.env.S3_VERIFICATION_BUCKET;
const region = process.env.AWS_REGION;

const client = new S3Client({ region });

export const uploadVerificationDocument = async (file, providerId) => {
  if (!bucket) throw new Error("S3_VERIFICATION_BUCKET is not configured");

  const extension =
    file.mimetype === "application/pdf" ? "pdf" :
    file.mimetype === "image/png" ? "png" : "jpg";

  const key = `provider-verification/${providerId}/${randomUUID()}.${extension}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: "AES256",
    Metadata: { providerid: String(providerId) }
  }));

  return key;
};

export const createVerificationDocumentUrl = async (key) => {
  if (!bucket) throw new Error("S3_VERIFICATION_BUCKET is not configured");

  return getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: "inline"
  }), { expiresIn: 120 });
};

export const deleteVerificationDocument = async (key) => {
  if (!bucket) throw new Error("S3_VERIFICATION_BUCKET is not configured");
  if (!key) return;

  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  }));
};
