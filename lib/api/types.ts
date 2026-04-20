/** §9 meta — backend ARCHITECTURE.md */
export type ApiMeta = {
  request_id?: string;
  pagination?: unknown;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  message_id?: string;
  details?: unknown;
};

export type ApiEnvelopeSuccess<T = unknown> = {
  success: true;
  data: T;
  meta?: ApiMeta;
};

export type ApiEnvelopeFail = {
  success: false;
  error: ApiErrorBody;
  meta?: ApiMeta;
};

export type ApiEnvelopeUnknown = ApiEnvelopeSuccess | ApiEnvelopeFail;
