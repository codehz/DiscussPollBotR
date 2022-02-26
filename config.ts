import * as YAML from "https://deno.land/std@0.127.0/encoding/yaml.ts";

export type Secret = {
  token: string;
  key: string;
};

export type Config = {
  api: string;
};

export const secret = YAML.parse(
  await Deno.readTextFile("./secret.yaml"),
) as Secret;

export const config = YAML.parse(
  await Deno.readTextFile("./secret.yaml"),
) as Config;
