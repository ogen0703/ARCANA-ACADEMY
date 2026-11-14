/** 受け取り箱の暗号:PBKDF2-SHA256(20万回)で合言葉から鍵を作り、AES-256-GCMで復号する。Python側(arcana_encrypt.py)と同じ形式 */
export type Sealed = { v: 1; salt: string; iv: string; ct: string };
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ITER = 200_000;

async function key(pass: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt", "encrypt"]);
}
export async function openSealed(s: Sealed, pass: string): Promise<string> {
  if (s.v !== 1) throw new Error("形式が違います");
  const k = await key(pass, b64(s.salt));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(s.iv) }, k, b64(s.ct));
  return new TextDecoder().decode(pt);
}
/** テスト用 */
export async function seal(text: string, pass: string): Promise<Sealed> {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(pass, salt), new TextEncoder().encode(text)));
  const enc = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return { v: 1, salt: enc(salt), iv: enc(iv), ct: enc(ct) };
}
