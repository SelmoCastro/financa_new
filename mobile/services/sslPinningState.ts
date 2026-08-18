export type SslPinningFailure = {
  host: string;
  message: string;
  occurredAt: number;
};

let lastSslPinningFailure: SslPinningFailure | null = null;

/**
 * Stores only a bounded native pinning failure diagnostic. It must never hold
 * request bodies, credentials, authorization headers, tokens, or certificates.
 */
export function recordSslPinningFailure(host: string, message?: string): void {
  lastSslPinningFailure = {
    host,
    message: (message || "Certificate pinning failure").slice(0, 160),
    occurredAt: Date.now(),
  };
}

export function consumeSslPinningFailure(): SslPinningFailure | null {
  const failure = lastSslPinningFailure;
  lastSslPinningFailure = null;
  return failure;
}
