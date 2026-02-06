import "server-only";

import { randomToken, sha256Hex } from "@/lib/crypto";
import { insertApiKey } from "@/lib/api-key-repo";
import { errBody, okBody, type HttpResult } from "@/lib/result";

export type CreateApiKeyBody = {
  id: string | null;
  name: string;
  created_at: string | null;
  token: string;
};

type CreateApiKeyResult = HttpResult<CreateApiKeyBody>;

export async function createApiKey(input: { name: string }): Promise<CreateApiKeyResult> {
  const name = input.name.trim();
  if (!name) {
    return errBody(400, "name_required");
  }

  const token = randomToken("tvk_");
  const tokenHash = await sha256Hex(token);
  const { id, name: storedName, createdAt, error } = await insertApiKey({ name, tokenHash });

  if (error) {
    return errBody(500, "db_error", error);
  }

  return okBody({
    id,
    name: storedName ?? name,
    created_at: createdAt,
    token,
  });
}
