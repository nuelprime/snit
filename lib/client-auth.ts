/**
 * Client-side helper to grab a Farcaster Quick Auth token.
 *
 * In a Farcaster client (Warpcast, etc.), this returns a signed JWT
 * we can send as `Authorization: Bearer <token>` to authenticate the user.
 *
 * Outside a Farcaster client (regular browser, no SDK context),
 * returns null and the caller should fall back to unauthenticated request
 * or block the action.
 */
export async function getQuickAuthToken(): Promise<string | null> {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    // sdk.quickAuth.getToken() returns { token } or throws if not in a FC client.
    const result = await sdk.quickAuth.getToken();
    return result?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Wrap a fetch call with Authorization header from Quick Auth.
 * If no token is available (not in FC client), the request goes out
 * without the header — backend will treat as anonymous (which our routes
 * explicitly handle as best-effort for /create or 401 for /mine).
 */
export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = await getQuickAuthToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
