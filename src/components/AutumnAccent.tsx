const LEAF_COLORS = ["#c2410c", "#ca8a04", "#b45309", "#9a3412", "#d97706"] as const;

const GARLAND_LEAVES = [
  { left: "4%", rotate: -18, scale: 1 },
  { left: "14%", rotate: 12, scale: 0.85 },
  { left: "26%", rotate: -8, scale: 1.1 },
  { left: "38%", rotate: 22, scale: 0.9 },
  { left: "50%", rotate: -14, scale: 1 },
  { left: "62%", rotate: 8, scale: 0.95 },
  { left: "74%", rotate: -20, scale: 1.05 },
  { left: "86%", rotate: 16, scale: 0.88 },
  { left: "96%", rotate: -6, scale: 1 },
] as const;

const FALLING_LEAVES = [
  { left: "8%", delay: "0s", duration: "5.2s", color: 0, drift: "-12px" },
  { left: "22%", delay: "1.4s", duration: "6.1s", color: 1, drift: "10px" },
  { left: "35%", delay: "0.6s", duration: "5.5s", color: 2, drift: "-8px" },
  { left: "48%", delay: "2.1s", duration: "6.4s", color: 3, drift: "14px" },
  { left: "61%", delay: "0.3s", duration: "5.8s", color: 4, drift: "-10px" },
  { left: "74%", delay: "1.8s", duration: "6s", color: 0, drift: "8px" },
  { left: "88%", delay: "1s", duration: "5.6s", color: 1, drift: "-14px" },
] as const;

function LeafShape({
  color,
  className,
  style,
}: {
  color: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 20 24"
      className={className}
      style={{ color, ...style }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M10 1.5C7 5.5 3.5 7 2.5 11c-.8 3.2.5 6.5 3.8 8.2 1.8.9 3.5 1.1 3.7 1.1.2 0 1.9-.2 3.7-1.1 3.3-1.7 4.6-5 3.8-8.2-1-4-4.5-5.5-7.5-9.5-.3-.4-.8-.4-1 0Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeOpacity="0.35"
        d="M10 3v18M10 8l-3 2M10 12l3 1.5M10 16l-2.5 2"
      />
    </svg>
  );
}

export function AutumnAccent() {
  return (
    <div
      className="autumn-strip relative h-10 w-full overflow-hidden border-b border-amber-900/30"
      aria-hidden
    >
      <div className="autumn-strip-sky absolute inset-0" />
      <ul className="pointer-events-none absolute inset-x-0 top-1.5 z-[1] flex list-none justify-between px-1 sm:px-3">
        {GARLAND_LEAVES.map((leaf, index) => (
          <li key={index} className="flex flex-1 justify-center">
            <LeafShape
              color={LEAF_COLORS[index % LEAF_COLORS.length]}
              className="h-4 w-3.5 drop-shadow-sm sm:h-5 sm:w-4"
              style={{
                transform: `rotate(${leaf.rotate}deg) scale(${leaf.scale})`,
              }}
            />
          </li>
        ))}
      </ul>
      {FALLING_LEAVES.map((leaf, index) => (
        <LeafShape
          key={index}
          color={LEAF_COLORS[leaf.color % LEAF_COLORS.length]}
          className="autumn-leaf pointer-events-none absolute top-0 z-[2] h-3.5 w-3 opacity-90"
          style={{
            left: leaf.left,
            animationDelay: leaf.delay,
            animationDuration: leaf.duration,
            // shortcut: drift via custom property; one keyframe curve for all leaves
            ["--autumn-drift" as string]: leaf.drift,
          }}
        />
      ))}
    </div>
  );
}
