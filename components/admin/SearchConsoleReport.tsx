"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { fetchSearchReport } from "@/lib/integrations/googleSearch";
import { googleSearchWindow } from "@/lib/integrations/googleSearchStatus";
import SearchConnection from "./SearchConnection";
type Report = Awaited<ReturnType<typeof fetchSearchReport>>;
export default function SearchConsoleReport({
  active = true,
}: {
  active?: boolean;
}) {
  const [start, setStart] = useState(() => googleSearchWindow(28).start),
    [end, setEnd] = useState(() => googleSearchWindow(28).end),
    [dimension, setDimension] = useState("query");
  const controller = useRef<AbortController | null>(null),
    lastRequest = useRef({ key: "", time: 0 });
  const [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(
    async (offset = 0) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setBusy(true);
      setError("");
      setReport(null);
      try {
        const r = await fetch(
          `/api/admin/phase2/search-console?${new URLSearchParams({ start, end, dimension, offset: String(offset) })}`,
          {
            cache: "no-store",
            signal: AbortSignal.any([c.signal, AbortSignal.timeout(30000)]),
          },
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (!c.signal.aborted) {
          setReport(data);
          lastRequest.current = {
            key: `${start}/${end}/${dimension}`,
            time: Date.now(),
          };
        }
      } catch (e) {
        if (!c.signal.aborted)
          setError(
            e instanceof Error && e.name !== "TimeoutError"
              ? e.message
              : "Rapor isteği zaman aşımına uğradı. Tekrar deneyin.",
          );
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    },
    [start, end, dimension],
  );
  useEffect(() => {
    if (!active || !start || !end || start > end) return;
    if (
      lastRequest.current.key === `${start}/${end}/${dimension}` &&
      Date.now() - lastRequest.current.time < 120000
    )
      return;
    const timer = setTimeout(() => void load(), 300);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, [active, start, end, dimension, load]);
  return (
    <section className="bg-white border rounded-2xl p-5 space-y-3">
      <h2 className="text-xl font-bold">Google Search Console</h2>
      <p className="text-sm">Hangi aramalar mağazanıza ziyaret getiriyor?</p>
      <details>
        <summary>Bağlantı ve veri kapsamı</summary>
        <p className="text-sm">
          Günler Pasifik takvimidir. Kesinleşmiş üst satırlar gösterilir; tüm
          aramaları kapsamaz. İndeksleme raporu değildir.
        </p>
        <SearchConnection />
      </details>
      <div className="flex flex-wrap gap-2">
        {([7, 28, 90] as const).map((days) => (
          <button
            key={days}
            disabled={busy}
            className="border rounded p-2"
            onClick={() => {
              const range = googleSearchWindow(days);
              setStart(range.start);
              setEnd(range.end);
              setReport(null);
              setError("");
            }}
          >
            {days} günlük aralık
          </button>
        ))}
      </div>
      <p className="text-xs">
        Hazır aralıklar veri gecikmesi için son 3 günü dışarıda bırakır; final
        verinin tamamlandığı garantisi değildir. Tarihleri elle
        değiştirebilirsiniz.
      </p>
      <fieldset disabled={busy} className="grid md:grid-cols-3 gap-3">
        <label>
          Başlangıç (PT)
          <input
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setReport(null);
            }}
            className="border p-2 block w-full"
          />
        </label>
        <label>
          Bitiş (PT)
          <input
            type="date"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setReport(null);
            }}
            className="border p-2 block w-full"
          />
        </label>
        <label>
          Boyut
          <select
            value={dimension}
            onChange={(e) => {
              setDimension(e.target.value);
              setReport(null);
            }}
            className="border p-2 block w-full"
          >
            <option value="query">Arama sorgusu</option>
            <option value="page">Sayfa</option>
            <option value="device">Cihaz</option>
          </select>
        </label>
        <button
          type="button"
          disabled={!start || !end || start > end}
          className="border p-2 rounded"
          onClick={() => load()}
        >
          Google raporunu getir
        </button>
      </fieldset>
      {busy && <p role="status">Google raporu yükleniyor…</p>}
      {error && <p role="alert">{error}</p>}
      {report && (
        <>
          <p className="text-sm">
            Alınma: {report.fetchedAt} · Başlangıç satırı{" "}
            {report.query.startRow} · {report.rows.length} satır · Final veriler
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Anahtar", "Tıklama", "Gösterim", "TO", "Konum"].map(
                    (s) => (
                      <th key={s} className="p-2 text-left">
                        {s}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.key}>
                    <td className="p-2 break-all">{row.key}</td>
                    <td>{row.clicks}</td>
                    <td>{row.impressions}</td>
                    <td>{(row.ctr * 100).toFixed(2)}%</td>
                    <td>{row.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.rows.length === 0 && (
            <p>
              Bu kapsamda dönen satır yok; tüm sitede trafik olmadığı anlamına
              gelmez.
            </p>
          )}
          {report.hasNext && (
            <button
              disabled={busy}
              className="border p-2"
              onClick={() => load(report.query.startRow + 100)}
            >
              Sonraki 100 satır
            </button>
          )}
          {report.query.startRow > 0 && (
            <button
              disabled={busy}
              className="border p-2"
              onClick={() => load(Math.max(0, report.query.startRow - 100))}
            >
              Önceki 100 satır
            </button>
          )}
          {report.capped && (
            <p>
              25.000 satır güvenli görüntüleme sınırı; tarih aralığını daraltın.
            </p>
          )}
        </>
      )}
    </section>
  );
}
