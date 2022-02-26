import { Context } from "https://deno.land/x/grammy@v1.7.0/mod.ts";
import { Cache } from "https://deno.land/x/local_cache@1.0/mod.ts";

const linkedChannelCache = new Cache<number, number>(1000 * 60 * 60);
const adminCache = new Cache<number, number[]>(1000 * 60 * 60);

export async function getLinkedChannel(ctx: Context) {
  const id = ctx.chat!.id;
  if (linkedChannelCache.has(id)) return linkedChannelCache.get(id);
  const chat = await ctx.getChat();
  const ret = chat.type == "supergroup" ? chat.linked_chat_id ?? 0 : 0;
  linkedChannelCache.set(id, ret);
  return ret;
}

export async function getAdminList(ctx: Context) {
  const id = ctx.chat!.id;
  if (adminCache.has(id)) return adminCache.get(id);
  const list = await ctx.getChatAdministrators();
  const ret = list.filter((x) => !x.user.is_bot).map((x) => x.user.id);
  adminCache.set(id, ret);
  return ret;
}
