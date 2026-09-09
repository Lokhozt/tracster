export const PASSWORD_RESET_DURATION_HOURS = [1, 24, 168] as const;
export type PasswordResetDurationHours = (typeof PASSWORD_RESET_DURATION_HOURS)[number];
