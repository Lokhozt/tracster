"use client";

import { cn } from "@/lib/utils";
import { tagTextColor, type TagRecord } from "@/lib/tags";

export function TagBubbles({
  tags,
  className,
}: {
  tags: TagRecord[];
  className?: string;
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li key={tag.id}>
          <TagBubble tag={tag} />
        </li>
      ))}
    </ul>
  );
}

export function TagBubble({
  tag,
  selected = true,
  className,
}: {
  tag: TagRecord;
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        !selected && "border border-stone-200 bg-stone-50 text-stone-400 opacity-40",
        className,
      )}
      style={
        selected
          ? {
              backgroundColor: tag.color,
              color: tagTextColor(tag.color),
            }
          : undefined
      }
    >
      <span className="truncate">{tag.name}</span>
    </span>
  );
}
