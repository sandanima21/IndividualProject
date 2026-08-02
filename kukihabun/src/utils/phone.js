// Sri Lankan local number ("077 123 4567" or "77 123 4567") → E.164 ("+94771234567").
export const toE164 = (raw) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0'))  return '+94' + digits.slice(1);
  if (digits.startsWith('94')) return '+' + digits;
  return '+94' + digits;
};
