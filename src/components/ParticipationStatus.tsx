import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * "Je participe" (green), "Chorégraphe" for the choreography's leads, or a neutral grey "Je
 * ne participe pas": not taking part is a fact, not an error.
 */
export function ParticipationStatus({
  participating,
  choreographer = false,
  className,
}: {
  participating: boolean;
  choreographer?: boolean;
  className?: string;
}) {
  const t = useTranslations("Components");
  return (
    <span
      className={cn(
        "text-sm font-medium",
        choreographer ? "text-amber-800" : participating ? "text-green-700" : "text-stone-500",
        className,
      )}
    >
      {choreographer
        ? t("choreographerStatus")
        : participating
          ? t("iAmParticipating")
          : t("iAmNotParticipating")}
    </span>
  );
}
