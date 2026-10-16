/**
 * VideoProvider interface — abstracts storage backends.
 * Implementations: S3/MinIO (dev/prod), YouTube/Vimeo (embed).
 * CRITICAL: Signed URLs are short-lived and only returned to authenticated users.
 */

export interface VideoUploadResult {
  storageKey: string;
  publicUrl?: string;
}

export interface VideoProvider {
  /** Generate a presigned upload URL for client-side direct upload */
  getUploadUrl(key: string, mimeType: string): Promise<{ uploadUrl: string; key: string }>;
  /** Generate a short-lived signed URL for playback */
  getPlaybackUrl(storageKey: string, expiresIn?: number): Promise<string>;
  /** Delete a stored video */
  deleteVideo(storageKey: string): Promise<void>;
}
