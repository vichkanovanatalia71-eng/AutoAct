import { pbkdf2Sync, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function deriveKey(masterKey: string, userSalt: string): Buffer {
  return pbkdf2Sync(masterKey, userSalt, 100_000, 32, "sha512");
}

export function encrypt(data: string, key: Buffer): { encrypted: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encrypted: encrypted + ":" + authTag,
    iv: iv.toString("hex"),
  };
}

export function decrypt(encrypted: string, iv: string, key: Buffer): string {
  const [encryptedData, authTag] = encrypted.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
