export function linkTarget(value: string) {
  const candidate = value.trim();
  if (!candidate || candidate.includes("\\")) return null;
  for (const character of candidate) {
    const code = character.charCodeAt(0);
    if (code <= 31 || code === 127) return null;
  }
  try {
    const parsed = new URL(candidate, "https://field-notes.invalid");
    if (["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol) && !parsed.username && !parsed.password) {
      return candidate;
    }
  } catch { /* invalid destinations remain plain text */ }
  return null;
}
