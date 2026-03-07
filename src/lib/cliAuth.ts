import { createHmac, timingSafeEqual } from "crypto";

const CLI_TOKEN_PREFIX = "lily_cli";
const DEFAULT_TTL_DAYS = 30;

interface CliTokenPayload {
  scope: "cli";
  exp: number;
  iat: number;
}

export function issueCliToken() {
  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + getCliTokenTtlDays() * 24 * 60 * 60;
  const payload: CliTokenPayload = {
    scope: "cli",
    iat: now,
    exp,
  };

  const payloadEncoded = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded, secret);

  return {
    token: `${CLI_TOKEN_PREFIX}.${payloadEncoded}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function isValidCliToken(token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const secret = getSigningSecret();
  if (!secret) {
    return false;
  }

  const [prefix, payloadEncoded, signature] = token.split(".");
  if (!prefix || !payloadEncoded || !signature || prefix !== CLI_TOKEN_PREFIX) {
    return false;
  }

  const expectedSignature = signPayload(payloadEncoded, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(payloadEncoded),
    ) as CliTokenPayload;

    if (payload.scope !== "cli") {
      return false;
    }

    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function getSigningSecret() {
  return process.env.AGENT_API_SECRET || process.env.CRON_SECRET || null;
}

function getCliTokenTtlDays() {
  const rawValue = process.env.CLI_TOKEN_TTL_DAYS;
  const parsed = Number.parseInt(rawValue || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_DAYS;
}

function signPayload(payloadEncoded: string, secret: string) {
  return encodeBase64Url(
    createHmac("sha256", secret).update(payloadEncoded).digest(),
  );
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}
