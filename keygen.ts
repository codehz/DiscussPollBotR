import { encode } from "https://deno.land/std@0.127.0/encoding/base64.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  true,
  [
    "sign",
    "verify",
  ],
);

const data = await crypto.subtle.exportKey("raw", key)

console.log(encode(data));
