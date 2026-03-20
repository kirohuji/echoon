export function jwtDecode(token: string) {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) throw new Error('Invalid token!');

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    console.error('jwtDecode failed:', e);
    return null;
  }
}

export function isValidToken(accessToken: string | null | undefined) {
  if (!accessToken) return false;
  const decoded = jwtDecode(accessToken);
  if (!decoded || typeof decoded.exp !== 'number') return false;
  return decoded.exp > Date.now() / 1000;
}

