export function getMessageOfTheDay(): string | null {
  const value = process.env.MOTD?.trim();
  return value || null;
}
