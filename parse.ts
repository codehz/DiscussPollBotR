export function parsePoll(text: string) {
  const [command, content] = text.split(/(?<=^\S+)\s/);
  const is_multi = command.startsWith("/m");
  if (content == null) throw new Error("空的消息");
  let sp1 = content.split("\n\n");
  let title: string, options: string[];
  switch (sp1.length) {
    case 1:
      [title, ...options] = content.split("\n");
      break;
    case 2:
      title = sp1[0];
      options = sp1[1].split("\n");
      break;
    default:
      throw new Error("格式错误");
  }
  if (options.length < 2) throw new Error("至少提供2个选项");
  if (options.length > 10) throw new Error("至多提供10个选项");
  return { is_multi, title, options } as const;
}