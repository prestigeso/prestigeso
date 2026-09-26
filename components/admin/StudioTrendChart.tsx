"use client";
import { useEffect, useId, useRef, useState } from "react";
import s from "./OverviewSoft.module.css";
import studioStyles from "./StudioInsights.module.css";
export type TrendPoint = {
  label: string;
  value: number | null;
  previous: number | null;
};
export default function StudioTrendChart({
  rows,
  unit,
  compact = false,
  studio = false,
}: {
  rows: TrendPoint[];
  unit: string;
  compact?: boolean;
  studio?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    id = useId().replace(/:/g, "");
  const [size, setSize] = useState({ width: 600, height: 300 }),
    [active, setActive] = useState(studio ? Math.max(0, rows.length - 1) : 0),
    [compare, setCompare] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const { width, height } = size,
    left = width < 420 ? 64 : 76,
    right = 16,
    top = 24,
    bottom = height - 35;
  const hasPrevious = rows.some((r) => r.previous !== null);
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.value ?? 0, compare ? (r.previous ?? 0) : 0]),
  );
  const magnitude = 10 ** Math.floor(Math.log10(max / 4));
  const step = Math.max(
      1,
      ([1, 2, 5, 10].find((n) => n * magnitude >= max / 4) || 10) * magnitude,
    ),
    ceiling = step * (studio ? Math.min(4,Math.ceil(max/step)) : 4);
  const x = (i: number) =>
    rows.length === 1
      ? (left + width - right) / 2
      : left + (i * (width - left - right)) / Math.max(1, rows.length - 1);
  const y = (value: number) => bottom - (value / ceiling) * (bottom - top);
  const paths = (key: "value" | "previous") => {
    const segments: { index: number; value: number }[][] = [];
    let current: { index: number; value: number }[] = [];
    rows.forEach((r, index) => {
      const value = r[key];
      if (value === null) {
        if (current.length) segments.push(current);
        current = [];
      } else current.push({ index, value });
    });
    if (current.length) segments.push(current);
    return segments;
  };
  const selected = rows[Math.min(active, rows.length - 1)];
  const format = (value: number | null | undefined) =>
    value == null
      ? "Veri yok"
      : value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const tickCount = width < 420 ? 3 : 5;
  const ticks = [
    ...new Set(
      Array.from({ length: tickCount }, (_, i) =>
        Math.round((i * (rows.length - 1)) / (tickCount - 1)),
      ),
    ),
  ];
  return (
    <>
      <div
        ref={ref}
        className={`${s.plot} ${studio ? studioStyles.plot : ""}`}
        onPointerMove={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect();
          setActive(
            Math.max(
              0,
              Math.min(
                rows.length - 1,
                Math.round(
                  ((e.clientX - bounds.left - left) / (width - left - right)) *
                    (rows.length - 1),
                ),
              ),
            ),
          );
        }}
      >
        {studio && selected && (
          <div className={studioStyles.chartReadout}>
            <span>{selected.label}</span>
            <strong>{format(selected.value)}</strong>
            <small>{unit}</small>
          </div>
        )}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${unit}: günlük performans grafiği`}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9aa6ba" stopOpacity=".25" />
              <stop offset="100%" stopColor="#9aa6ba" stopOpacity=".01" />
            </linearGradient>
          </defs>
          {Array.from({length:Math.round(ceiling/step)+1},(_,i)=>i).map((i) => (
            <g key={i}>
              <line
                x1={left}
                x2={width - right}
                y1={y(i * step)}
                y2={y(i * step)}
                stroke="#eceef2"
              />
              <text
                x={left - 10}
                y={y(i * step) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#626a77"
              >
                {(i * step).toLocaleString("tr-TR", {
                  notation: ceiling >= 100000 ? "compact" : "standard",
                })}
              </text>
            </g>
          ))}
          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 9}
              textAnchor={
                i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"
              }
              fontSize="12"
              fill="#626a77"
            >
              {rows[i]?.label}
            </text>
          ))}
          {[
            ...(compare && hasPrevious ? ["previous" as const] : []),
            "value" as const,
          ].flatMap((key) =>
            paths(key).map((segment, index) => {
              const line = segment
                .map((r, i) => `${i ? "L" : "M"}${x(r.index)},${y(r.value)}`)
                .join(" ");
              return (
                <g key={`${key}-${index}`}>
                  {key === "value" && segment.length > 1 && (
                    <path
                      d={`${line} L${x(segment[segment.length - 1].index)},${bottom} L${x(segment[0].index)},${bottom} Z`}
                      fill={`url(#${id})`}
                    />
                  )}
                  <path
                    d={line}
                    fill="none"
                    stroke={key === "value" ? "#343e50" : "#b7bfcb"}
                    strokeWidth={key === "value" ? 2.6 : 1.8}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {segment.length === 1 && (
                    <circle
                      cx={x(segment[0].index)}
                      cy={y(segment[0].value)}
                      r="4"
                      fill={key === "value" ? "#343e50" : "#b7bfcb"}
                    />
                  )}
                </g>
              );
            }),
          )}
          {selected && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={top}
              y2={bottom}
              stroke="#c5ccd7"
            />
          )}
          {selected?.value != null && (
            <circle
              cx={x(active)}
              cy={y(selected.value)}
              r="5"
              fill="#343e50"
              stroke="white"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>
      {!compact && (
        <div className={s.legend}>
          <span>
            <i />
            Seçili dönem
          </span>
          {compare && hasPrevious && (
            <span>
              <i className={s.previous} />
              Önceki dönem
            </span>
          )}
          <label>
            <input
              type="checkbox"
              checked={compare}
              disabled={!hasPrevious}
              onChange={(e) => setCompare(e.target.checked)}
            />
            Önceki dönemle karşılaştır
          </label>
        </div>
      )}
      <div className={s.detail}>
        <label>
          Gün{" "}
          <select
            aria-label="Grafikte gün seç"
            value={Math.min(active, rows.length - 1)}
            onChange={(e) => setActive(Number(e.target.value))}
          >
            {rows.map((r, i) => (
              <option value={i} key={i}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <output aria-live="polite">
          {unit}: {format(selected?.value)}
          {compare ? ` · Önceki: ${format(selected?.previous)}` : ""}
        </output>
      </div>
      {!compact && (
        <p className={s.note}>
          Eksik günler sıfır kabul edilmez ve çizgiyle birleştirilmez.
          {!hasPrevious && " Önceki dönem için kayıt bulunamadı."}
        </p>
      )}
    </>
  );
}
