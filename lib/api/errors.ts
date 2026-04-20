import type { ApiEnvelopeFail } from "./types";

export type ApiNormalizedError = {
  code: string;
  message: string;
  requestId?: string;
  status?: number;
  details?: unknown;
};

/** Application error mapped from §9 envelope or HTTP layer — suitable for HeroUI toast/alert later. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly requestId?: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(init: ApiNormalizedError) {
    super(init.message);
    this.name = "ApiClientError";
    this.code = init.code;
    this.requestId = init.requestId;
    this.status = init.status;
    this.details = init.details;
  }

  static fromEnvelope(
    body: ApiEnvelopeFail,
    httpStatus?: number,
  ): ApiClientError {
    const err = body.error;
    return new ApiClientError({
      code: err.code,
      message: err.message,
      requestId: body.meta?.request_id,
      status: httpStatus,
      details: err.details,
    });
  }

  static network(message: string, cause?: unknown): ApiClientError {
    const e = new ApiClientError({
      code: "NETWORK_ERROR",
      message,
      details: cause,
    });
    return e;
  }

  static http(status: number, message: string): ApiClientError {
    return new ApiClientError({
      code: "HTTP_ERROR",
      message,
      status,
    });
  }
}
