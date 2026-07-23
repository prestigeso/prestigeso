"use client";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export default function AdminPagination({
  page,
  pageSize,
  total,
  loading = false,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Liste sayfaları"
      className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"
    >
      <button
        type="button"
        disabled={loading || page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-xl border border-gray-200 px-4 py-2 text-[10px] font-black uppercase disabled:cursor-not-allowed disabled:opacity-40"
      >
        Önceki
      </button>
      <span className="text-[10px] font-bold text-gray-500">
        {page} / {totalPages} · {total} kayıt
      </span>
      <button
        type="button"
        disabled={loading || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-xl bg-black px-4 py-2 text-[10px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sonraki
      </button>
    </nav>
  );
}
