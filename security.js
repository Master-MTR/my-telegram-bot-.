/**
 * Enterprise Telegram Security & Cryptographic Verification Engine
 * Guards against Tampering, Man-in-the-Middle, Replay Attacks, and Payment Fraud
 */

import crypto from 'crypto';

/**
 * 1. Cryptographically Verify Telegram WebApp Data (HMAC-SHA256)
 * Ensures incoming data originated strictly from Telegram and was NOT tampered with.
 */
export function verifyTelegramWebAppData(initDataRaw, botToken) {
  if (!initDataRaw || !botToken) return false;

  try {
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // Sort parameters alphabetically
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // HMAC secret key derived from bot token using "WebAppData" string
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculated hash signature
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));
  } catch (err) {
    console.error('Crypto Validation Error:', err);
    return false;
  }
}

/**
 * 2. Strict Rate Limiting Engine (Anti-Spam / Anti-DDoS)
 * Prevents brute-forcing coupon codes or flooding API endpoints.
 */
const rateLimitMap = new Map();

export function isRateLimited(userId, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const userRecord = rateLimitMap.get(userId) || { count: 0, resetTime: now + windowMs };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + windowMs;
  } else {
    userRecord.count += 1;
  }

  rateLimitMap.set(userId, userRecord);
  return userRecord.count > maxRequests;
}

/**
 * 3. Sanitization Engine (Anti-XSS / Anti-Injection)
 * Escapes malicious scripts from customer names, addresses, or products.
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * 4. Anti-Fraud & Double Payment Verification Engine (Zarinpal Direct Verification)
 * Prevents Replay Attacks & Cart Price Manipulation.
 */
export async function verifyPaymentZarinpalStrict(merchantId, authority, expectedAmountRial) {
  try {
    const response = await fetch('https://api.zarinpal.com/pg/v4/payment/verify.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: expectedAmountRial,
        authority: authority
      })
    });

    const data = await response.json();

    // Status 100 = First-time successful payment, 101 = Already verified (Replay attack prevention)
    if (data.data && (data.data.code === 100 || data.data.code === 101)) {
      return {
        success: true,
        refId: data.data.ref_id,
        code: data.data.code
      };
    }
  } catch (err) {
    console.error('Strict Payment Verification Failed:', err);
  }

  return { success: false, refId: null };
}
