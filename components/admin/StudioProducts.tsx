"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ProductRow, CategoryRow } from "./types";
import { sanitizeImageUrl } from "@/lib/utils";
import ProductBulkActions from "./ProductBulkActions";
import s from "./AdminStudio.module.css";
type Props = {
  dbProducts: ProductRow[];
  categories: CategoryRow[];
  onEdit: (id: number) => void;
  onSave: (
    id: number,
    field: "price" | "stock",
    value: number,
  ) => Promise<boolean>;
};
function QuickField({
  value,
  label,
  integer,
  disabled,
  save,
}: {
  value: number;
  label: string;
  integer?: boolean;
  disabled: boolean;
  save: (value: number) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(String(value)),
    [state, setState] = useState(""),
    pending = useRef(false);
  async function commit() {
    if (pending.current || draft === String(value)) return;
    const n = Number(draft);
    if (
      draft.trim() === "" ||
      !Number.isFinite(n) ||
      n < 0 ||
      n > 1e9 ||
      (integer && !Number.isInteger(n))
    ) {
      setDraft(String(value));
      setState("Geçersiz değer");
      return;
    }
    pending.current = true;
    setState("Kaydediliyor…");
    try {
      if (await save(n)) setState("Kaydedildi");
      else {
        setDraft(String(value));
        setState("Kayıt başarısız; yeniden deneyin.");
      }
    } catch {
      setDraft(String(value));
      setState("Kayıt doğrulanamadı.");
    } finally {
      pending.current = false;
    }
  }
  return (
    <label className={s.field}>
      {integer ? "Stok" : "Fiyat (₺)"}
      <input
        type="number"
        min="0"
        max="1000000000"
        step={integer ? 1 : 0.01}
        aria-label={label}
        value={draft}
        disabled={disabled || pending.current}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      <small role="status">{state}</small>
    </label>
  );
}
export default function StudioProducts({
  dbProducts,
  categories,
  onEdit,
  onSave,
}: Props) {
  const [stock, setStock] = useState("all"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [out, setOut] = useState(0),
    [products, setProducts] = useState<ProductRow[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [bulk, setBulk] = useState(false);
  const request = useRef<AbortController | null>(null),
    lock = useRef(false),
    more = useRef<HTMLDivElement | null>(null),
    nextRequested = useRef(false),
    productCache = useRef<ProductRow[]>([]),
    loaded = useRef<{ filter: string; refresh: number; page: number } | null>(null);
  const filter = JSON.stringify({ stock, sort, query, category });
  const load = useCallback(async () => {
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setLoading(true);
    setError("");
    try {
      const incremental = loaded.current?.filter === filter && loaded.current.refresh === refresh && loaded.current.page === page - 1;
      const pages: ProductRow[] = [];
      let count = 0, outCount = 0;
      for (let next = incremental ? page : 1; next <= page; next++) {
        const r = await fetch(
          "/api/admin/products?" + new URLSearchParams({ page: String(next), stock, sort, q: query, category }),
          { signal: c.signal, cache: "no-store" },
        );
        const d = await r.json();
        if (!r.ok || !Array.isArray(d.products) || !Number.isSafeInteger(d.total)) throw Error(d.error || "Ürünler alınamadı.");
        pages.push(...d.products);
        count = d.total;
        outCount = d.outOfStockTotal || 0;
        if (pages.length >= count) break;
      }
      if (!c.signal.aborted) {
        const merged = [...new Map((incremental ? [...productCache.current,...pages] : pages).map(p => [p.id,p])).values()];
        if (incremental && merged.length === productCache.current.length && merged.length < count) throw Error('Liste değişti veya yeni sayfa tekrarlı geldi. Listeyi yenileyin.');
        productCache.current = merged;
        setProducts(merged);
        setTotal(count);
        setOut(outCount);
        loaded.current = { filter, refresh, page };
      }
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : "Liste yüklenemedi.");
    } finally {
      if (!c.signal.aborted) { setLoading(false); nextRequested.current = false; }
    }
  }, [page, stock, sort, query, category, filter, refresh]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => {
      clearTimeout(t);
      request.current?.abort();
    };
  }, [load, dbProducts]);
  useEffect(() => {
    const target = more.current;
    if (!target || loading || error || busy || bulk || products.length >= total) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !nextRequested.current) { nextRequested.current = true; observer.disconnect(); setPage(p => p + 1); }
    }, { rootMargin: "320px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, error, busy, bulk, products.length, total]);
  const change = (fn: () => void) => {
    setPage(1);
    setProducts([]);
    productCache.current = [];
    setLoading(true);
    nextRequested.current = false;
    loaded.current = null;
    setSelected([]);
    setBulk(false);
    fn();
  };
  const save = async (id: number, field: "price" | "stock", value: number) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    request.current?.abort();
    try {
      const ok = await onSave(id, field, value);
      if (ok) {
        setProducts((ps) =>
          ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
        );
        setRefresh((x) => x + 1);
        setMessage("Kaydedildi. Liste ve stok sayaçları yenileniyor.");
      }
      return ok;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div>
      <div className={s.tabs}>
        {[
          ["all", "Tümü"],
          ["in", "Stokta olanlar"],
          ["out", `Stoğu tükenenler (${out})`],
        ].map(([key, name]) => (
          <button
            disabled={busy}
            key={key}
            aria-pressed={stock === key}
            onClick={() => change(() => setStock(key))}
          >
            {name}
          </button>
        ))}
      </div>
      <div className={s.toolbar}>
        <input
          type="search"
          aria-label="Ürün veya SKU ara"
          placeholder="Ürün adı, SKU veya barkod ara"
          value={query}
          disabled={busy}
          onChange={(e) => change(() => setQuery(e.target.value))}
        />
        <select
          aria-label="Kategori"
          value={category}
          disabled={busy}
          onChange={(e) => change(() => setCategory(e.target.value))}
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sıralama"
          value={sort}
          disabled={busy}
          onChange={(e) => change(() => setSort(e.target.value))}
        >
          <option value="newest">En yeni</option>
          <option value="oldest">En eski</option>
          <option value="price_asc">Fiyat: artan</option>
          <option value="price_desc">Fiyat: azalan</option>
        </select>
      </div>
      <div className={s.toolbar}>
        <button
          className={s.button}
          disabled={!selected.length || busy}
          onClick={() => {
            setBulk(!bulk);
          }}
        >
          Toplu işlem ({selected.length})
        </button>
        <button
          className={s.button}
          disabled={busy || loading}
          onClick={() => setRefresh((x) => x + 1)}
        >
          Listeyi yenile
        </button>
        <small className={s.muted}>
          {products.length} / {total} ürün gösteriliyor · En fazla 25 ürün birlikte düzenlenir; seçimler yüklenen ürünlerde korunur.
        </small>
      </div>
      {bulk && (
        <ProductBulkActions
          products={products.filter(p => selected.includes(p.id))}
          categories={categories}
          onBusy={setBusy}
          onDone={(failed, result) => {
            setMessage(result);
            setSelected(failed);
            setBulk(false);
            setRefresh(n => n + 1);
          }}
        />
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <p role="status" className={s.status}>
        {busy ? "Kaydediliyor…" : message}
      </p>
      <section className={s.panel} aria-busy={loading}>
        {loading && <p>Ürünler yükleniyor…</p>}
        {!loading && !products.length && !error && (
          <p>Bu filtreye uygun ürün yok.</p>
        )}
        {products.map((p) => {
          const missing = [
            !p.description?.trim() ? "Açıklama eksik" : "",
            !p.image && !p.images?.length ? "Görsel eksik" : "",
            !p.category ? "Kategori eksik" : "",
          ].filter(Boolean);
          return (
            <div className={s.product} key={p.id}>
              <input
                type="checkbox"
                aria-label={`${p.name} seç`}
                disabled={busy || (!selected.includes(p.id) && selected.length >= 25)}
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? ids.length < 25 ? [...ids, p.id] : ids
                      : ids.filter((id) => id !== p.id),
                  )
                }
              />
              <Image
                width={70}
                height={80}
                className={s.thumb}
                src={sanitizeImageUrl(p.images?.[0] || p.image)}
                alt={p.name}
              />
              <div>
                <h3>
                  {p.name}
                  {missing.length > 0 && (
                    <button
                      type="button"
                      className={s.warning}
                      aria-label={`${p.name}: ${missing.join(", ")}`}
                      title={missing.join(", ")}
                      onClick={() =>
                        setMessage(`${p.name}: ${missing.join(", ")}`)
                      }
                    >
                      !
                    </button>
                  )}
                </h3>
                <p className={s.muted}>
                  {p.SKU} · {p.category || "Kategori yok"}
                </p>
                <div className={s.productLinks}>
                  <button disabled={busy} onClick={() => onEdit(p.id)}>
                    Düzenle / varyantlar
                  </button>
                  <a
                    href={`/product/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mağazada görüntüle ↗
                  </a>
                </div>
              </div>
              <QuickField
                key={`price-${p.id}-${p.price}`}
                value={Number(p.price)}
                label={`${p.name} fiyat`}
                disabled={busy || loading}
                save={(v) => save(p.id, "price", v)}
              />
              <QuickField
                key={`stock-${p.id}-${p.stock}`}
                integer
                value={Number(p.stock)}
                label={`${p.name} stok`}
                disabled={busy || loading}
                save={(v) => save(p.id, "stock", v)}
              />
            </div>
          );
        })}
      </section>
      <div ref={more} className={s.listEnd} aria-live="polite">
        {error && products.length > 0 && <button className={s.button} onClick={() => setRefresh(n => n + 1)}>Yüklemeyi tekrar dene</button>}
        {!error && !loading && products.length < total && <button className={s.button} disabled={busy} onClick={() => { if (!nextRequested.current) { nextRequested.current = true; setPage(p => p + 1); } }}>Daha fazla ürün göster</button>}
        {!error && !loading && total > 0 && products.length >= total && <span>Tüm {total} ürün gösteriliyor.</span>}
      </div>
    </div>
  );
}
