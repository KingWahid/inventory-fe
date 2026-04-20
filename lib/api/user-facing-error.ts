import { ApiClientError } from "./errors";

const RATE_LIMIT_ID =
  "Terlalu banyak percobaan. Tunggu sejenak sebelum mencoba lagi.";

function detailString(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const m = (details as Record<string, unknown>).message;
  return typeof m === "string" && m.trim() ? m.trim() : null;
}

function translateDetailForUi(detail: string): string {
  const lower = detail.toLowerCase();
  if (lower.includes("sku") && lower.includes("already exists")) {
    return "SKU ini sudah digunakan untuk tenant Anda.";
  }
  if (
    lower.includes("warehouse") &&
    lower.includes("code") &&
    lower.includes("already exists")
  ) {
    return "Kode gudang ini sudah digunakan untuk tenant Anda.";
  }
  return detail;
}

/** Maps API / transport errors to safe UI copy (429-friendly; §9 message otherwise). */
export function userFacingApiMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429) return RATE_LIMIT_ID;
    const fromDetails = detailString(error.details);
    if (fromDetails) return translateDetailForUi(fromDetails);
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}
