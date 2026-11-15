import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { MenuRowIcon, type MenuRowIconName } from "@/components/MenuRowIcon";

/** A titled group of menu rows (the "Plus" page). */
export function MenuGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="max-w-xl">
      {title && <h2 className="mb-2 px-1 text-xs font-semibold text-stone-500">{title}</h2>}
      <div className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {children}
      </div>
    </section>
  );
}

/** One destination: icon, label (and an optional detail line), chevron. */
export function MenuRow({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: MenuRowIconName;
  label: string;
  detail?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition hover:bg-stone-100"
    >
      <MenuRowIcon name={icon} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-stone-900">{label}</span>
        {detail && <span className="block truncate text-sm text-stone-500">{detail}</span>}
      </span>
      <ChevronRightIcon />
    </Link>
  );
}
