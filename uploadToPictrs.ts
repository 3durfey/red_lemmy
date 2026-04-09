/**
 * @fileoverview Pictrs upload helper for Reddit-hosted images.
 */

import axios from "axios";
import FormData from "form-data";

/**
 * Downloads an image from a URL and uploads it to Lemmy's pictrs host.
 *
 * @param imageUrl Source image URL.
 * @param jwt Lemmy JWT used for authenticated upload.
 * @returns pictrs URL on success, otherwise null.
 */
export async function uploadToPictrs(
  imageUrl: string,
  jwt: string,
): Promise<string | null> {
  try {
    const base = process.env.LEMMY_BASE_URL?.replace(/\/+$/, "");
    if (!base) return null;

    // Download image server-side (no browser Referer header).
    const mediaRes = await axios.get<Buffer>(imageUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; red_lemmy/1.0)",
      },
      timeout: 15000,
    });

    const contentType: string =
      (mediaRes.headers["content-type"] as string) ||
      "application/octet-stream";

    const isImage = contentType.startsWith("image/");
    if (!isImage) return null;

    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const filename = `image.${ext}`;

    const form = new FormData();
    form.append("images[]", Buffer.from(mediaRes.data), {
      filename,
      contentType,
    });

    const uploadRes = await axios.post<{
      files?: Array<{ file: string; delete_token: string }>;
      msg?: string;
    }>(`${base}/pictrs/image`, form, {
      headers: {
        ...form.getHeaders(),
        Cookie: `jwt=${jwt}`,
      },
      timeout: 30000,
    });

    const file = uploadRes.data?.files?.[0]?.file;
    if (!file) return null;

    return `${base}/pictrs/image/${file}`;
  } catch {
    // Upload failure is non-fatal — post will be created without image
    return null;
  }
}
