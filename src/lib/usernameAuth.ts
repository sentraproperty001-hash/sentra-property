const INTERNAL_ACCOUNT_DOMAIN = 'accounts.sentraproperty.com';
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

export const isValidUsername = (username: string): boolean => USERNAME_PATTERN.test(username);

export const usernameToAuthEmail = (username: string): string => (
  `${normalizeUsername(username)}@${INTERNAL_ACCOUNT_DOMAIN}`
);

export const isEmailLogin = (value: string): boolean => value.includes('@');
