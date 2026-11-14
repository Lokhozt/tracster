"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AccountProfileForm } from "@/components/AccountProfileForm";
import { FilterSheet } from "@/components/FilterSheet";
import { NavIcon } from "@/components/NavIcon";
import { RoleBadge } from "@/components/UserForms";
import type { UserRole } from "@/generated/prisma/client";
import type { Language } from "@/i18n/config";

/**
 * Top of the account page: who you are (name, contact, role) at a glance, with the profile
 * form behind an edit button instead of always-open fields.
 */
export function AccountIdentityCard({
  name,
  email,
  phone,
  role,
  showRole,
  profile,
  seasonalStyleLockedByEnv,
}: {
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  /** Role badge for people with admin privileges (as in the sidebar). */
  showRole: boolean;
  profile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    displayLanguage: Language;
    disableSeasonalStyle: boolean;
  };
  seasonalStyleLockedByEnv: boolean;
}) {
  const t = useTranslations("Account");
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex max-w-xl items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white">
        <NavIcon label="account" className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold">{name}</p>
        <p className="truncate text-sm text-stone-600">{email}</p>
        {phone && <p className="truncate text-sm text-stone-600">{phone}</p>}
        {showRole && (
          <div className="mt-1">
            <RoleBadge role={role} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={t("editProfile")}
        title={t("editProfile")}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-100 hover:text-stone-900"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <FilterSheet open={editing} onClose={() => setEditing(false)} title={t("editProfile")}>
        <AccountProfileForm
          user={profile}
          seasonalStyleLockedByEnv={seasonalStyleLockedByEnv}
          bare
          onSaved={() => setEditing(false)}
        />
      </FilterSheet>
    </div>
  );
}
