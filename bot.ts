import {
  Bot,
  Context,
  InlineKeyboard,
} from "https://deno.land/x/grammy@v1.7.0/mod.ts";
import type {
  Message,
} from "https://deno.land/x/grammy@v1.7.0/platform.deno.ts";

import { config, secret } from "./config.ts";
import { sign, verify } from "./crypto.ts";
import { getAdminList, getLinkedChannel } from "./caches.ts";
import { parsePoll } from "./parse.ts"

const bot = new Bot(secret.token, {
  client: {
    apiRoot: config.api ?? "https://api.telegram.org",
  },
});

function createTitle(
  title: string,
  msg: Message,
) {
  let author: string = "anonymous";
  if (msg.sender_chat?.type == "channel") {
    author = msg.sender_chat.title + `(@${msg.sender_chat.username!})`;
  } else if (msg.from) {
    author = msg.from.first_name;
    if (msg.from.last_name) author += " " + msg.from.last_name;
    if (msg.from.username) author += `(@${msg.from.username})`;
  }
  return `${title}\n投稿自 ${author}`;
}

const buildPostButtons = (hash: string) =>
  new InlineKeyboard()
    .text("刷新/发送到关联频道", "approve " + hash)
    .text("退稿/自删", "reject")
    .inline_keyboard;

const buildRefreshButtons = (hash: string) =>
  new InlineKeyboard()
    .text("刷新", "refresh " + hash)
    .text("退稿/自删", "reject")
    .inline_keyboard;

function createPoll(
  chat_id: number,
  text: string,
  hash: string,
  sender: Message,
  reply_to_message_id?: number,
) {
  const { is_multi, title, options } = parsePoll(text);
  return bot.api.sendPoll(chat_id, createTitle(title, sender), options, {
    protect_content: true,
    allows_multiple_answers: is_multi,
    type: "regular",
    is_closed: true,
    reply_to_message_id,
    reply_markup: {
      inline_keyboard: buildPostButtons(hash),
    },
  });
}

async function reportPollError(
  ctx: Context,
  e: Error,
  hash: string,
  reply_to_message_id = ctx.msg?.message_id,
) {
  await ctx.reply(e + "", {
    allow_sending_without_reply: true,
    reply_to_message_id,
    disable_notification: true,
    protect_content: true,
    reply_markup: {
      inline_keyboard: buildRefreshButtons(hash),
    },
  });
}

bot.command(["poll", "mpoll"], async (ctx: Context) => {
  if (!await getLinkedChannel(ctx)) {
    await ctx.reply("仅在有关联频道的群组中有效", {
      allow_sending_without_reply: true,
      reply_to_message_id: ctx.msg?.message_id,
      disable_notification: true,
      protect_content: true,
    });
    return;
  }
  const text = ctx.msg!.text!;
  const hash = await sign(text);
  try {
    await createPoll(
      ctx.chat!.id,
      text,
      hash,
      ctx.msg!,
      ctx.msg?.message_id,
    );
  } catch (e) {
    await reportPollError(ctx, e, hash);
  }
});

const verify_permission = async (ctx: Context, next: () => Promise<void>) => {
  if ((await getAdminList(ctx)).includes(ctx.from!.id)) return await next();
  const reply = ctx.msg!.reply_to_message!;
  if (reply.from!.is_bot) return await ctx.answerCallbackQuery("匿名投稿需要管理员点击刷新");
  if (ctx.from!.id == reply.from!.id) return await next();
  await ctx.answerCallbackQuery("无权限操作");
};

const refresh = async (ctx: Context) => {
  await ctx.answerCallbackQuery("消息已被修改，正在重新生成");
  const reply = ctx.msg!.reply_to_message!;
  const text = reply.text!;
  const hash = await sign(text);
  try {
    await createPoll(
      ctx.chat!.id,
      text,
      await sign(text),
      reply,
      reply.message_id,
    );
    await ctx.deleteMessage();
  } catch (e) {
    try {
      await ctx.deleteMessage();
    } catch {}
    await reportPollError(ctx, e, hash, reply.message_id);
  }
};

bot.callbackQuery(
  /refresh .+/,
  async (ctx, next) => {
    const hash = ctx.callbackQuery.data.split(" ")[1];
    if (hash == null) {
      await ctx.answerCallbackQuery("意外参数");
      return;
    }
    const reply = ctx.msg?.reply_to_message;
    if (reply == null || !reply.text) {
      await ctx.answerCallbackQuery("无法读取原始消息");
      await ctx.deleteMessage();
      return;
    }
    try {
      if (!await verify(reply.text, hash)) return next();
    } catch (e) {
      console.error(e);
      return next();
    }
    await ctx.answerCallbackQuery("未更改原始消息");
  },
  verify_permission,
  refresh,
);

bot.callbackQuery(
  /approve .+/,
  async (ctx, next) => {
    const hash = ctx.callbackQuery.data.split(" ")[1];
    if (hash == null) {
      await ctx.answerCallbackQuery("意外参数");
      return;
    }
    const reply = ctx.msg?.reply_to_message;
    if (reply == null || !reply.text) {
      await ctx.answerCallbackQuery("无法读取原始消息");
      await ctx.deleteMessage();
      return;
    }
    try {
      if (!await verify(reply.text, hash)) return next();
    } catch (e) {
      console.error(e);
      return next();
    }
    if ((await getAdminList(ctx)).includes(ctx.from.id)) {
      const channel = await getLinkedChannel(ctx);
      const { is_multi, title, options } = parsePoll(reply.text);
      try {
        const from = ctx.msg!.reply_to_message!;
        await bot.api.sendPoll(channel, createTitle(title, from), options, {
          allows_multiple_answers: is_multi,
          type: "regular",
        });
        await ctx.answerCallbackQuery("发送成功");
        await ctx.deleteMessage();
        try {
          await bot.api.deleteMessage(
            ctx.chat!.id,
            ctx.msg!.reply_to_message!.message_id,
          );
        } catch {}
      } catch (e) {
        await ctx.answerCallbackQuery("发送失败，可能是没有加入频道");
      }
    } else {
      await ctx.answerCallbackQuery("无权限操作");
      return;
    }
  },
  verify_permission,
  refresh,
);

bot.callbackQuery("reject", async (ctx) => {
  try {
    const orig = ctx.msg?.reply_to_message;
    if (orig && orig.from) {
      if (
        orig.from.id != ctx.from.id &&
        !(await getAdminList(ctx)).includes(ctx.from.id)
      ) {
        await ctx.answerCallbackQuery("无权限操作");
        return;
      }
      await ctx.deleteMessage();
      await bot.api.deleteMessage(ctx.chat!.id, orig.message_id);
    } else {
      await ctx.deleteMessage();
    }
    await ctx.answerCallbackQuery("已经退稿");
  } catch (e) {
    await ctx.answerCallbackQuery("退稿并尝试删除，但是删除失败");
    console.error(e);
  }
});

export default bot;
