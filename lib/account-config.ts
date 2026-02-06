import "server-only";

import { decodeBase32, normalizeBase32Secret } from "@/lib/base32";
import { base64urlToBytes, bytesToBase64url, normalizeToBase64url } from "@/lib/base64url";
import { asOptionalInt } from "@/lib/request";
import { encryptSecret } from "@/lib/secret";
import { errValue, okValue, type ValueResult } from "@/lib/result";

export type AccountAlgorithm = "SHA1" | "STEAM";

const SHA1_DEFAULT_DIGITS = 6;
const SHA1_DEFAULT_PERIOD = 30;
const STEAM_DIGITS = 5;
const STEAM_PERIOD = 30;

export type CreateAccountPayload = {
  label: string;
  issuer: string | null;
  encrypted_secret: string;
  digits: number;
  period: number;
  algorithm: AccountAlgorithm;
};

export type PatchPayload = Record<string, unknown>;

export function getAccountConfigErrorStatus(error: string): number {
  if (error === "unsupported_algorithm") return 400;
  if (error.startsWith("invalid_")) return 400;
  if (error.endsWith("_required")) return 400;
  if (error === "empty_patch") return 400;
  return 500;
}

function toErrorDetails(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveCreateAlgorithm(input: unknown): ValueResult<AccountAlgorithm> {
  if (typeof input !== "string") return okValue("SHA1");
  const normalized = input.trim().toUpperCase();
  if (normalized === "SHA1" || normalized === "STEAM") return okValue(normalized);
  return errValue("unsupported_algorithm");
}

function resolveRequestedAlgorithm(input: unknown): ValueResult<AccountAlgorithm | undefined> {
  if (typeof input !== "string") return okValue(undefined);
  const normalized = input.trim().toUpperCase();
  if (normalized === "SHA1" || normalized === "STEAM") return okValue(normalized);
  return errValue("unsupported_algorithm");
}

function resolveStoredAlgorithm(input: string | null | undefined): AccountAlgorithm {
  return typeof input === "string" && input.toUpperCase() === "STEAM" ? "STEAM" : "SHA1";
}

function normalizeSha1Secret(rawSecret: string): ValueResult<string> {
  const normalized = normalizeBase32Secret(rawSecret);
  try {
    decodeBase32(normalized);
  } catch (error) {
    return errValue("invalid_secret", toErrorDetails(error));
  }
  return okValue(normalized);
}

function normalizeSteamSecret(rawSecret: string): ValueResult<string> {
  const compact = rawSecret.trim().replace(/\s+/g, "");
  const upper = compact.toUpperCase();
  const looksLikeBase32 = /^[A-Z2-7]+$/.test(upper) && upper.length % 8 === 0;

  let secretBytes: Uint8Array;
  try {
    if (looksLikeBase32) {
      const normalized = normalizeBase32Secret(compact);
      secretBytes = decodeBase32(normalized);
    } else {
      secretBytes = base64urlToBytes(normalizeToBase64url(compact));
    }
  } catch (error) {
    return errValue("invalid_secret", toErrorDetails(error));
  }

  if (secretBytes.length === 0) return errValue("invalid_secret");
  return okValue(bytesToBase64url(secretBytes));
}

function normalizeSecretForAlgorithm(rawSecret: string, algorithm: AccountAlgorithm): ValueResult<string> {
  return algorithm === "STEAM"
    ? normalizeSteamSecret(rawSecret)
    : normalizeSha1Secret(rawSecret);
}

export async function prepareCreateAccountPayload(
  body: Record<string, unknown>,
): Promise<ValueResult<CreateAccountPayload>> {
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const issuer = typeof body.issuer === "string" ? body.issuer.trim() : null;
  const rawSecret = typeof body.secret === "string" ? body.secret : "";

  if (!label) return errValue("label_required");
  if (!rawSecret) return errValue("secret_required");

  const algorithmResult = resolveCreateAlgorithm(body.algorithm);
  if (!algorithmResult.ok) return algorithmResult;
  const algorithm = algorithmResult.value;

  const requestedDigits = asOptionalInt(body.digits) ?? SHA1_DEFAULT_DIGITS;
  const requestedPeriod = asOptionalInt(body.period) ?? SHA1_DEFAULT_PERIOD;

  let digits = requestedDigits;
  let period = requestedPeriod;
  if (algorithm === "SHA1") {
    if (digits !== 6 && digits !== 8) return errValue("invalid_digits");
    if (period < 5 || period > 120) return errValue("invalid_period");
  } else {
    digits = STEAM_DIGITS;
    period = STEAM_PERIOD;
  }

  const normalizedSecretResult = normalizeSecretForAlgorithm(rawSecret, algorithm);
  if (!normalizedSecretResult.ok) return normalizedSecretResult;

  const encrypted_secret = await encryptSecret(normalizedSecretResult.value);
  return okValue({
    label,
    issuer,
    encrypted_secret,
    digits,
    period,
    algorithm,
  });
}

export async function preparePatchAccountPayload(
  body: Record<string, unknown>,
  currentAlgorithmInput: string | null | undefined,
): Promise<ValueResult<PatchPayload>> {
  const currentAlgorithm = resolveStoredAlgorithm(currentAlgorithmInput);
  const requestedAlgorithmResult = resolveRequestedAlgorithm(body.algorithm);
  if (!requestedAlgorithmResult.ok) return requestedAlgorithmResult;
  const requestedAlgorithm = requestedAlgorithmResult.value;
  const nextAlgorithm = requestedAlgorithm ?? currentAlgorithm;

  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string") patch.label = body.label.trim();
  if (typeof body.issuer === "string") patch.issuer = body.issuer.trim() || null;

  const rawSecret = typeof body.secret === "string" ? body.secret : undefined;
  if (
    requestedAlgorithm !== undefined &&
    requestedAlgorithm !== currentAlgorithm &&
    (!rawSecret || rawSecret.trim().length === 0)
  ) {
    return errValue("secret_required_for_algorithm_change");
  }

  const requestedDigits = asOptionalInt(body.digits);
  const requestedPeriod = asOptionalInt(body.period);

  if (nextAlgorithm === "STEAM") {
    if (requestedDigits !== undefined && requestedDigits !== STEAM_DIGITS) {
      return errValue("invalid_digits_for_steam");
    }
    if (requestedPeriod !== undefined && requestedPeriod !== STEAM_PERIOD) {
      return errValue("invalid_period_for_steam");
    }
    if (requestedAlgorithm === "STEAM") {
      patch.algorithm = "STEAM";
      patch.digits = STEAM_DIGITS;
      patch.period = STEAM_PERIOD;
    }
  } else {
    if (requestedDigits !== undefined) {
      if (requestedDigits !== 6 && requestedDigits !== 8) return errValue("invalid_digits");
      patch.digits = requestedDigits;
    }
    if (requestedPeriod !== undefined) {
      if (requestedPeriod < 5 || requestedPeriod > 120) return errValue("invalid_period");
      patch.period = requestedPeriod;
    }
    if (requestedAlgorithm === "SHA1") patch.algorithm = "SHA1";
  }

  if (rawSecret !== undefined && rawSecret.trim().length > 0) {
    const normalizedSecretResult = normalizeSecretForAlgorithm(rawSecret, nextAlgorithm);
    if (!normalizedSecretResult.ok) return normalizedSecretResult;
    patch.encrypted_secret = await encryptSecret(normalizedSecretResult.value);

    if (nextAlgorithm === "STEAM") {
      patch.algorithm = "STEAM";
      patch.digits = STEAM_DIGITS;
      patch.period = STEAM_PERIOD;
    } else if (requestedAlgorithm === "SHA1") {
      patch.algorithm = "SHA1";
    }
  }

  if (Object.keys(patch).length === 0) return errValue("empty_patch");
  return okValue(patch);
}
