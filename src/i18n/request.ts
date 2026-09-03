import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  getDefaultLanguage,
  isLanguage,
  LANGUAGE_COOKIE,
  languageFromPreference,
  languageLocales,
} from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";

export default getRequestConfig(async () => {
  const [cookieStore, user] = await Promise.all([cookies(), getCurrentUser()]);
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE)?.value;
  const language =
    languageFromPreference(user?.displayLanguage) ??
    (isLanguage(cookieLanguage) ? cookieLanguage : getDefaultLanguage());
  const locale = languageLocales[language];
  const [sharedMessages, pageMessages, componentMessages] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/pages-${locale}.json`),
    import(`../../messages/components-${locale}.json`),
  ]);

  return {
    locale,
    messages: {
      ...sharedMessages.default,
      ...pageMessages.default,
      ...componentMessages.default,
    },
  };
});
