import type { VideoProvider } from "./provider";
import { S3VideoProvider } from "./s3-provider";

let _provider: VideoProvider | null = null;

export function getVideoProvider(): VideoProvider {
  if (_provider) return _provider;

  const storageType = process.env.STORAGE_PROVIDER ?? "minio";

  switch (storageType) {
    case "s3":
    case "minio":
      _provider = new S3VideoProvider();
      break;
    default:
      // Fallback to S3 provider (works for MinIO)
      _provider = new S3VideoProvider();
  }

  return _provider;
}

/**
 * Get a playback URL for a video, handling all providers.
 * For YouTube/Vimeo, returns the external URL as-is.
 * For S3/MinIO, returns a short-lived signed URL.
 */
export async function getVideoPlaybackUrl(video: {
  provider: string;
  storageKey: string | null;
  externalUrl: string | null;
}): Promise<string | null> {
  if (video.provider === "YOUTUBE" || video.provider === "VIMEO") {
    return video.externalUrl;
  }

  if (!video.storageKey) return null;

  const provider = getVideoProvider();
  return provider.getPlaybackUrl(video.storageKey);
}
