// Thrown by a provider when it detects a rate-limit/quota response (HTTP
// 429), as opposed to any other failure (bad key, network error, malformed
// response) — generateJSON only treats this specific case as "out of free
// capacity" and blocks further attempts instead of falling through to a
// paid provider.
export class ProviderQuotaExceededError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ProviderQuotaExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
