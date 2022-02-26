import bot from "./bot.ts";
import { run } from "https://deno.land/x/grammy_runner@v1.0.3/mod.ts";
import getLogger from "./log.ts";

const log = getLogger("entry");

log.debug("start");

bot.catch((err) => log.error(err.message));

run(bot);
