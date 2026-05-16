const botPattern =
  /bot|spider|crawler|preview|slackbot|discordbot|whatsapp|telegrambot|facebookexternalhit|linkedinbot|embedly/i;

export const isBotUserAgent = (userAgent?: string | null): boolean => {
  if (!userAgent) {
    return false;
  }

  return botPattern.test(userAgent);
};
