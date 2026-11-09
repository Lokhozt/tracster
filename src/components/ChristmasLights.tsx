const BULB_COLORS = [
  "#ef4444",
  "#22c55e",
  "#facc15",
  "#38bdf8",
  "#fb923c",
  "#e879f9",
  "#fef08a",
] as const;

const ROWS = [
  { count: 18, wireClass: "top-[38%]", dangle: "0px" },
  { count: 16, wireClass: "top-[72%]", dangle: "3px" },
] as const;

const SNOWFLAKES = [
  { left: "6%", delay: "0s", duration: "4.2s", size: "4px" },
  { left: "18%", delay: "1.1s", duration: "5.5s", size: "3px" },
  { left: "31%", delay: "0.4s", duration: "4.8s", size: "5px" },
  { left: "47%", delay: "2s", duration: "5.2s", size: "3px" },
  { left: "62%", delay: "0.8s", duration: "4.5s", size: "4px" },
  { left: "78%", delay: "1.6s", duration: "5.8s", size: "3px" },
  { left: "91%", delay: "0.2s", duration: "4.9s", size: "5px" },
] as const;

function ClassicBulb({
  color,
  index,
  row,
}: {
  color: string;
  index: number;
  row: number;
}) {
  const duration = 1.6 + (index % 5) * 0.35;
  return (
    <span
      className="christmas-bulb classic-bulb flex flex-col items-center"
      style={{
        color,
        marginTop: row === 1 ? ROWS[1].dangle : undefined,
        animationDuration: `${duration}s`,
        animationDelay: `${((index * 0.19 + row * 0.4) % 2.6).toFixed(2)}s`,
      }}
    >
      <span className="classic-bulb-cap" />
      <span className="classic-bulb-glass" style={{ backgroundColor: color }} />
    </span>
  );
}

export function ChristmasLights() {
  return (
    <div className="festive-strip relative h-11 w-full overflow-hidden border-b border-red-950/30" aria-hidden>
      <div className="festive-strip-sky absolute inset-0" />
      <div className="festive-strip-stars absolute inset-0 opacity-80" />

      {ROWS.map((row, rowIndex) => (
        <svg
          key={rowIndex}
          className={`pointer-events-none absolute inset-x-0 ${row.wireClass} h-3 w-full -translate-y-1/2 text-emerald-600/90`}
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={
              rowIndex === 0
                ? "M0 6 Q 20 1, 40 5 T 80 4 Q 90 7, 100 5"
                : "M0 4 Q 30 8, 50 4 T 100 6"
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}

      <div className="relative z-[1] flex h-full flex-col justify-between py-1">
        {ROWS.map((row, rowIndex) => (
          <ul
            key={rowIndex}
            className="flex list-none items-end justify-between gap-0 px-0.5 sm:px-2"
          >
            {Array.from({ length: row.count }, (_, index) => {
              const color = BULB_COLORS[(index + rowIndex * 3) % BULB_COLORS.length];
              return (
                <li key={index} className="flex flex-1 justify-center">
                  <ClassicBulb color={color} index={index} row={rowIndex} />
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      {SNOWFLAKES.map((flake, index) => (
        <span
          key={index}
          className="festive-snowflake pointer-events-none absolute top-0 rounded-full bg-white/90"
          style={{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
          }}
        />
      ))}
    </div>
  );
}
