"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const MAX_PREVIEW_ROWS = 500;

type SheetPreview = {
  name: string;
  rows: string[][];
  truncated: boolean;
};

export function OfficeFileViewer({
  src,
  kind,
  title,
}: {
  src: string;
  kind: "docx" | "xlsx";
  title: string;
}) {
  const t = useTranslations("Components");
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    async function load() {
      setLoading(true);
      setError(null);
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(t("officePreviewError"));
      }
      if (kind === "docx") {
        if (!container) return;
        const { renderAsync } = await import("docx-preview");
        container.replaceChildren();
        await renderAsync(await response.blob(), container, container, {
          inWrapper: true,
          breakPages: true,
          className: "docx",
        });
        return;
      }

      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
      const nextSheets = workbook.SheetNames.map((name) => {
        const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
          workbook.Sheets[name],
          { header: 1, raw: false, defval: "" },
        );
        const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
        const visibleRows = rows.slice(0, MAX_PREVIEW_ROWS).map((row) =>
          Array.from({ length: width }, (_, index) => String(row[index] ?? "")),
        );
        return {
          name,
          rows: visibleRows,
          truncated: rows.length > MAX_PREVIEW_ROWS,
        };
      });
      if (!cancelled) {
        setSheets(nextSheets);
        setActiveSheet(0);
      }
    }

    load()
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : t("officePreviewError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, src, t]);

  const sheet = sheets[activeSheet];

  return (
    <div>
      {loading && <p className="mb-3 text-sm text-stone-500">{t("loading")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {kind === "docx" && (
        <div
          ref={containerRef}
          aria-label={title}
          className="max-h-[calc(100vh-12rem)] min-h-[32rem] overflow-auto rounded-lg border border-stone-200 bg-white"
        />
      )}
      {kind === "xlsx" && sheet && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {sheets.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b border-stone-200 p-2">
              {sheets.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
                    index === activeSheet
                      ? "bg-stone-900 text-white"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                  onClick={() => setActiveSheet(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
          {sheet.truncated && (
            <p className="border-b border-stone-200 px-3 py-2 text-sm text-stone-600">
              {t("showingFirstRows", { count: MAX_PREVIEW_ROWS })}
            </p>
          )}
          {sheet.rows.length === 0 ? (
            <p className="p-4 text-sm text-stone-600">{t("emptySheet")}</p>
          ) : (
            <div className="max-h-[calc(100vh-12rem)] min-h-[24rem] overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <tbody>
                  {sheet.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border border-stone-200 px-2 py-1 align-top whitespace-pre-wrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
