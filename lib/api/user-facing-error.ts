import { ApiClientError } from "./errors";

const RATE_LIMIT_ID =
  "Terlalu banyak percobaan. Tunggu sejenak sebelum mencoba lagi.";

/** Maps API / transport errors to safe UI copy (429-friendly; §9 message otherwise). */
export function userFacingApiMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429) return RATE_LIMIT_ID;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}
