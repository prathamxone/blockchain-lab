import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "../../config/env.js";

const AES_ALGO = "aes-256-gcm";

export interface EncryptedEnvelope {
  encryptedPayload: string;
  encryptedDek: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}

interface DekEnvelope {
  iv: string;
  authTag: string;
  ciphertext: string;
}

function parseKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("KYC encryption key must be 32 bytes (base64)");
  }

  return key;
}

function getKeyByVersion(version: string): Buffer {
  if (version === "v1") {
    return parseKey(env.KYC_ENC_KEY_V1_BASE64);
  }

  if (version === "v2") {
    if (!env.KYC_ENC_KEY_V2_BASE64) {
      throw new Error("KYC key version v2 is not configured");
    }

    return parseKey(env.KYC_ENC_KEY_V2_BASE64);
  }

  throw new Error(`Unsupported KYC key version: ${version}`);
}

function encryptDek(dek: Buffer, keyVersion: string): string {
  const key = getKeyByVersion(keyVersion);
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGO, key, iv);
  cipher.setAAD(Buffer.from(`dvote:dek:${keyVersion}`, "utf8"));

  const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const bundle: DekEnvelope = {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };

  return Buffer.from(JSON.stringify(bundle), "utf8").toString("base64");
}

function decryptDek(encryptedDek: string, keyVersion: string): Buffer {
  const key = getKeyByVersion(keyVersion);
  const bundleRaw = Buffer.from(encryptedDek, "base64").toString("utf8");
  const bundle = JSON.parse(bundleRaw) as DekEnvelope;

  const decipher = createDecipheriv(AES_ALGO, key, Buffer.from(bundle.iv, "base64"));
  decipher.setAAD(Buffer.from(`dvote:dek:${keyVersion}`, "utf8"));
  decipher.setAuthTag(Buffer.from(bundle.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(bundle.ciphertext, "base64")),
    decipher.final()
  ]);
}

export function encryptJsonEnvelope(payload: unknown): EncryptedEnvelope {
  const keyVersion = env.KYC_ENC_ACTIVE_KEY_VERSION;
  const dek = randomBytes(32);
  const iv = randomBytes(12);

  const cipher = createCipheriv(AES_ALGO, dek, iv);
  cipher.setAAD(Buffer.from(`dvote:kyc:${keyVersion}`, "utf8"));

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedPayload: ciphertext.toString("base64"),
    encryptedDek: encryptDek(dek, keyVersion),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion
  };
}

export function decryptJsonEnvelope(bundle: EncryptedEnvelope): unknown {
  const dek = decryptDek(bundle.encryptedDek, bundle.keyVersion);

  const decipher = createDecipheriv(AES_ALGO, dek, Buffer.from(bundle.iv, "base64"));
  decipher.setAAD(Buffer.from(`dvote:kyc:${bundle.keyVersion}`, "utf8"));
  decipher.setAuthTag(Buffer.from(bundle.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(bundle.encryptedPayload, "base64")),
    decipher.final()
  ]);

  return JSON.parse(plaintext.toString("utf8"));
}
