import crypto from 'crypto';

const rawKey = process.env.CF_PRIVATE_KEY || '';
// support both raw PEM and escaped "\n" form in env
const cfPrivateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
const cfKeyPairId = process.env.CF_KEY_PAIR_ID || '';
const cfDomain = process.env.CF_DOMAIN || '';

function awsBase64(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');
}

export function signResourcePattern(resourcePattern: string, ttlSeconds = 600): string {
  if (!cfPrivateKey || !cfKeyPairId) {
    throw new Error('CF_PRIVATE_KEY and CF_KEY_PAIR_ID must be set');
  }
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const policy = JSON.stringify({
    Statement: [{
      Resource: resourcePattern,
      Condition: { DateLessThan: { 'AWS:EpochTime': expires } },
    }],
  });
  const policyB64 = awsBase64(Buffer.from(policy));
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(policy);
  const signature = awsBase64(signer.sign(cfPrivateKey));
  return `Policy=${policyB64}&Signature=${signature}&Key-Pair-Id=${cfKeyPairId}`;
}

export function getCfBaseUrl(): string {
  if (!cfDomain) throw new Error('CF_DOMAIN must be set');
  return `https://${cfDomain}`;
}
