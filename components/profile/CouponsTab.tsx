export default function CouponsTab() {
  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
        İndirim Kuponlarım
      </h3>
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 relative overflow-hidden">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
        <span className="text-4xl mb-4 opacity-50">🎟️</span>
        <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
          Şu an aktif bir kuponunuz bulunmuyor.
        </p>
      </div>
    </div>
  );
}