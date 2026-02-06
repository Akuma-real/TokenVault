import "server-only";

import { sha256Hex } from "@/lib/crypto";
import { peekShareTokenWithAccount } from "@/lib/share-repo";
import { errValue, okValue, type ValueResult } from "@/lib/result";

export type SharePreview = {
  isValid: boolean;
  isConsumed: boolean;
  label: string;
  issuer: string | null;
  expiresAt: string | null;
};

type SharePreviewResult = ValueResult<SharePreview>;

export async function loadSharePreview(token: string): Promise<SharePreviewResult> {
  const tokenHash = await sha256Hex(token);
  const { row: share, error } = await peekShareTokenWithAccount(tokenHash);

  if (error) return errValue(error);

  return okValue({
    isValid: !!share?.is_valid,
    isConsumed: !!share?.consumed_at,
    label: share?.label?.trim() ? share.label : "账户",
    issuer: share?.issuer ?? null,
    expiresAt: share?.expires_at ?? null,
  });
}
