/**
 * Returns a timestamp string with timezone in the format: YYYY-MM-DD HH:mm:ss+HH:MM
 */
export function getTimestampWithTimezone(): string {
  const now = new Date();
  const tzOffset = -now.getTimezoneOffset();
  const hours = Math.floor(Math.abs(tzOffset) / 60);
  const minutes = Math.abs(tzOffset) % 60;
  const tzString = `${tzOffset >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return now.toISOString().slice(0, 19) + tzString;
} 