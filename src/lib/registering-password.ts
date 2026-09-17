import { createHash, timingSafeEqual } from "crypto";

export function getRegisteringPassword() {
  const value = process.env.REGISTERING_PASSWORD?.trim();
  return value ? value : null;
}

export function isRegistrationPasswordRequired() {
  return getRegisteringPassword() !== null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function registrationPasswordMatches(candidate: unknown) {
  const expected = getRegisteringPassword();
  if (!expected) {
    return true;
  }
  if (typeof candidate !== "string") {
    return false;
  }
  return timingSafeEqual(digest(expected), digest(candidate));
}
