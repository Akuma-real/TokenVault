export type ErrorBody = {
  error: string;
  details?: string;
};

export function toErrorBody(error: string, details?: string): ErrorBody {
  return { error, ...(details ? { details } : {}) };
}

export type ValueResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; details?: string };

export function okValue<T>(value: T): ValueResult<T> {
  return { ok: true, value };
}

export function errValue<T>(error: string, details?: string): ValueResult<T> {
  return { ok: false, error, details };
}

export type HttpResult<T> =
  | { ok: true; body: T }
  | { ok: false; status: number; body: ErrorBody };

export function okBody<T>(body: T): HttpResult<T> {
  return { ok: true, body };
}

export function errBody<T>(status: number, error: string, details?: string): HttpResult<T> {
  return { ok: false, status, body: toErrorBody(error, details) };
}
