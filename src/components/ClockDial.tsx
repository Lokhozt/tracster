"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const SIZE = 280;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 112;
const INNER_RADIUS = 76;
const KNOB_RADIUS = 19;

type DialMode = "hour" | "minute";

/** Position of the label at `step` (0 = top) out of `steps`, on a ring of `radius`. */
function pointAt(step: number, steps: number, radius: number): { x: number; y: number } {
  const angle = (step / steps) * 2 * Math.PI;
  return { x: CENTER + radius * Math.sin(angle), y: CENTER - radius * Math.cos(angle) };
}

/** Hours: 1–12 on the inner ring, 00 and 13–23 on the outer ring (like a phone clock app). */
function hourPosition(hour: number): { step: number; radius: number } {
  if (hour >= 1 && hour <= 12) {
    return { step: hour % 12, radius: INNER_RADIUS };
  }
  return { step: hour % 12, radius: OUTER_RADIUS };
}

/**
 * Clock face to pick an hour (two rings, 24 h) or a minute (one ring). Tap or slide a finger
 * around it; lifting the finger calls `onPicked` (e.g. to move on to the minutes). Arrow keys
 * and Enter work too.
 */
export function ClockDial({
  mode,
  value,
  onChange,
  onPicked,
  label,
}: {
  mode: DialMode;
  /** 0–23 for hours, 0–59 for minutes. */
  value: number;
  onChange: (value: number) => void;
  onPicked: (value: number) => void;
  label: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastValue = useRef(value);

  function valueAt(clientX: number, clientY: number): number | null {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }
    const rect = svg.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const dx = (clientX - rect.left) * scale - CENTER;
    const dy = (clientY - rect.top) * scale - CENTER;
    const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const angle = (degrees + 360) % 360;
    if (mode === "minute") {
      // Fingers are not precise: snap to 5 minutes (arrow keys still move by one).
      return (Math.round(angle / 30) * 5) % 60;
    }
    const step = Math.round(angle / 30) % 12;
    const inner = Math.hypot(dx, dy) < (INNER_RADIUS + OUTER_RADIUS) / 2;
    if (inner) {
      return step === 0 ? 12 : step;
    }
    return step === 0 ? 0 : step + 12;
  }

  function update(clientX: number, clientY: number) {
    const next = valueAt(clientX, clientY);
    if (next !== null && next !== lastValue.current) {
      lastValue.current = next;
      onChange(next);
    }
  }

  const selected =
    mode === "hour"
      ? (() => {
          const { step, radius } = hourPosition(value);
          return pointAt(step, 12, radius);
        })()
      : pointAt(value, 60, OUTER_RADIUS);

  const labels =
    mode === "hour"
      ? Array.from({ length: 24 }, (_, hour) => {
          const { step, radius } = hourPosition(hour);
          const outer = radius === OUTER_RADIUS;
          // Inner ring "1…12", outer ring "00, 13…23" (as on a phone clock).
          const text = outer ? String(hour).padStart(2, "0") : String(hour);
          return { value: hour, text, ...pointAt(step, 12, radius), small: outer };
        })
      : Array.from({ length: 12 }, (_, index) => ({
          value: index * 5,
          text: String(index * 5).padStart(2, "0"),
          ...pointAt(index * 5, 60, OUTER_RADIUS),
          small: false,
        }));

  const max = mode === "hour" ? 24 : 60;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max - 1}
      aria-valuenow={value}
      aria-valuetext={String(value).padStart(2, "0")}
      // Fits short phones too: never taller than ~40% of the screen.
      className="mx-auto block w-full max-w-[min(18rem,40dvh)] touch-none rounded-full outline-none select-none focus-visible:ring-3 focus-visible:ring-stone-900/60"
      onPointerDown={(event) => {
        event.preventDefault();
        dragging.current = true;
        lastValue.current = value;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (dragging.current) {
          update(event.clientX, event.clientY);
        }
      }}
      onPointerUp={(event) => {
        if (!dragging.current) {
          return;
        }
        dragging.current = false;
        update(event.clientX, event.clientY);
        onPicked(lastValue.current);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowRight") {
          event.preventDefault();
          onChange((value + 1) % max);
        } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
          event.preventDefault();
          onChange((value - 1 + max) % max);
        } else if (event.key === "Enter") {
          event.preventDefault();
          onPicked(value);
        }
      }}
    >
      <circle cx={CENTER} cy={CENTER} r={CENTER} className="fill-stone-100" />
      {/* Hand and knob on the selected value. */}
      <line x1={CENTER} y1={CENTER} x2={selected.x} y2={selected.y} strokeWidth={2} className="stroke-stone-900" />
      <circle cx={CENTER} cy={CENTER} r={3.5} className="fill-stone-900" />
      <circle cx={selected.x} cy={selected.y} r={KNOB_RADIUS} className="fill-stone-900" />
      {labels.map((item) => (
        <text
          key={item.value}
          x={item.x}
          y={item.y}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn(
            "pointer-events-none tabular-nums",
            item.small ? "text-[13px]" : "text-[15px]",
            item.value === value ? "fill-white font-semibold" : item.small ? "fill-stone-500" : "fill-stone-800",
          )}
        >
          {item.text}
        </text>
      ))}
    </svg>
  );
}
