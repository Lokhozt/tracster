import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function ParticipationStatus({
  participating,
  className,
}: {
  participating: boolean;
  className?: string;
}) {
  const t = useTranslations("Components");
  return (
    <span
      className={cn(
        "text-sm font-medium",
        participating ? "text-green-700" : "text-red-700",
        className,
      )}
    >
      {participating ? t("iAmParticipating") : t("iAmNotParticipating")}
    </span>
  );
}
