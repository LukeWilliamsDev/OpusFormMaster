const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmailList = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

export const getValidCcEmails = (value: string, primaryEmail: string) => {
  const primary = primaryEmail.trim().toLowerCase();
  const emails = normalizeEmailList(value);
  return {
    emails,
    invalid: emails.filter((email) => !EMAIL_PATTERN.test(email) || email.length > 320),
    deduped: emails.filter((email) => email !== primary),
  };
};

export const appendCcEmail = (value: string, email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizeEmailList(value).includes(normalizedEmail)) return value;
  const current = value.trim();
  return current ? `${current}, ${normalizedEmail}` : normalizedEmail;
};
