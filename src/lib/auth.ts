import crypto from 'crypto';

/**
 * Perform a constant-time comparison of two strings to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Dummy comparison to prevent timing side channels
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
