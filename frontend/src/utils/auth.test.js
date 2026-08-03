import { decodeJwtPayload, isTokenValid } from './auth';

function createToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `header.${encoded}.signature`;
}

describe('JWT browser validation', () => {
  it('decodes base64url payloads containing URL-safe substitutions', () => {
    const token =
      'header.eyJleHAiOjk5OTk5OTk5OTksInYiOiJYMFNrfDM-XnA5T3cifQ.signature';

    expect(decodeJwtPayload(token)).toEqual({
      exp: 9999999999,
      v: 'X0Sk|3>^p9Ow',
    });
  });

  it('accepts an unexpired token', () => {
    const token = createToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: 'admin',
    });

    expect(isTokenValid(token)).toBe(true);
  });

  it('rejects an expired token', () => {
    const token = createToken({
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    expect(isTokenValid(token)).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(isTokenValid('not-a-jwt')).toBe(false);
    expect(decodeJwtPayload(null)).toBeNull();
  });
});
