import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAppName } from "@/lib/app-name";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  highlight?: boolean;
};

function linkPattern() {
  return /\[([^\]]+)\]\(([^)]+)\)/g;
}

function privacyContactEmail() {
  const email = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function isSafeHref(href: string) {
  return (
    (href.startsWith("/") && !href.startsWith("//")) ||
    href.startsWith("https://") ||
    href.startsWith("http://") ||
    href.startsWith("mailto:")
  );
}

function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(linkPattern())) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    const label = match[1] ?? "";
    const href = match[2] ?? "";
    if (isSafeHref(href)) {
      const className =
        "font-medium text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900";
      if (href.startsWith("/")) {
        nodes.push(
          <Link key={index} href={href} className={className}>
            {label}
          </Link>,
        );
      } else {
        nodes.push(
          <a
            key={index}
            href={href}
            className={className}
            {...(href.startsWith("mailto:")
              ? {}
              : { target: "_blank", rel: "noopener noreferrer" })}
          >
            {label}
          </a>,
        );
      }
    } else {
      nodes.push(match[0]);
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes}</>;
}

function readSections(value: unknown): LegalSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((section) => {
    if (!section || typeof section !== "object" || !("title" in section)) {
      return [];
    }
    const candidate = section as LegalSection;
    if (typeof candidate.title !== "string") {
      return [];
    }
    return [
      {
        title: candidate.title,
        paragraphs: Array.isArray(candidate.paragraphs)
          ? candidate.paragraphs.filter((paragraph) => typeof paragraph === "string")
          : [],
        items: Array.isArray(candidate.items)
          ? candidate.items.filter((item) => typeof item === "string")
          : [],
        highlight: candidate.highlight === true,
      },
    ];
  });
}

export async function LegalDocument({
  page,
}: {
  page: "privacy" | "terms";
}) {
  const t = await getTranslations(`Legal.${page}`);
  const appName = getAppName();
  const contactEmail = privacyContactEmail();
  const values = { appName, email: contactEmail ?? "" };
  const sections = readSections(t.raw("sections"));

  return (
    <article className="max-w-3xl space-y-8 text-sm leading-6 text-stone-700">
      <p className="text-stone-500">{t("updated")}</p>
      {sections.map((section) => (
        <section
          key={section.title}
          className={
            section.highlight ? "rounded-xl border border-stone-200 bg-white p-5 shadow-sm" : undefined
          }
        >
          <h2 className="mb-3 text-lg font-semibold text-stone-900">{fill(section.title, values)}</h2>
          {section.paragraphs && section.paragraphs.length > 0 && (
            <div className="space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>
                  <RichText text={fill(paragraph, values)} />
                </p>
              ))}
            </div>
          )}
          {section.items && section.items.length > 0 && (
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {section.items.map((item) => (
                <li key={item}>
                  <RichText text={fill(item, values)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-900">{t("contactTitle")}</h2>
        <div className="space-y-3">
          <p>
            <RichText text={t("contactBody", { appName })} />
          </p>
          {contactEmail && (
            <p>
              <RichText text={t("contactEmail", { email: contactEmail })} />
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
