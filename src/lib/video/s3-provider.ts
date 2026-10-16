import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VideoProvider } from "./provider";

function createS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });
}

export class S3VideoProvider implements VideoProvider {
  private client: S3Client;
  private bucket: string;
  private baseUrl: string | null;

  constructor() {
    this.client = createS3Client();
    this.bucket = process.env.S3_BUCKET_VIDEOS ?? "lms-videos";
    this.baseUrl = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${this.bucket}`
      : null;
  }

  async getUploadUrl(
    key: string,
    mimeType: string
  ): Promise<{ uploadUrl: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    return { uploadUrl, key };
  }

  async getPlaybackUrl(
    storageKey: string,
    expiresIn = Number(process.env.SIGNED_URL_EXPIRES_IN ?? 3600)
  ): Promise<string> {
    // For MinIO/S3, generate presigned GET URL
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteVideo(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey })
    );
  }
}
