import { secret } from "./config.ts";
import { decode, encode } from "https://deno.land/std@0.127.0/encoding/base64.ts";

const rawkey = decode(secret.key);

const algorithm = { name: "HMAC", hash: "SHA-256" };

const key = await crypto.subtle.importKey(
  "raw",
  rawkey,
  algorithm,
  false,
  ["sign", "verify"],
);

const encoder = new TextEncoder();

export async function sign(message: string) {
  const buffer = encoder.encode(message);
  const data = await crypto.subtle.sign(
    algorithm,
    key,
    buffer,
  );
  return encode(data);
}

export async function verify(message: string, signature: string) {
  const binsig = decode(signature);
  const bindat = encoder.encode(message);
  return await crypto.subtle.verify(algorithm, key, binsig, bindat);
}