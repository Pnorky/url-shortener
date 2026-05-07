function formatRelativeTime(createdAt: number, now = Date.now()): string {
  const sec = Math.floor((now - createdAt) / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return min <= 1 ? "1m ago" : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return hr <= 1 ? "1h ago" : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return day <= 1 ? "1d ago" : `${day}d ago`;
  try {
    return new Date(createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: createdAt < now - 365 * 24 * 3600 * 1000 ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}
