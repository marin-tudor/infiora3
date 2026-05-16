import { isBotUserAgent } from './requestUtils';

describe('isBotUserAgent', () => {
  test('should detect common crawler user agents', () => {
    expect(isBotUserAgent('Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
  });

  test('should allow normal browser traffic', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36'
      )
    ).toBe(false);
  });
});
