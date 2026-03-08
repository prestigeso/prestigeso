export default function MessagesTab({ messages }: { messages: any[] }) {
  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase mb-6 text-black border-b-2 border-gray-100 pb-4">
        Destek Mesajlarım
      </h3>

      {messages.length === 0 ? (
        <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">📧</span>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-4">
            Henüz mesajınız yok.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:border-black transition-colors">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                Mesajınız - {new Date(m.created_at).toLocaleDateString("tr-TR")}
              </p>
              <p className="text-sm font-bold text-black">{m.message}</p>

              {m.answer ? (
                <div className="pl-4 border-l-2 border-green-500 bg-green-50/30 p-3 rounded-r-2xl mt-4">
                  <p className="text-[10px] font-black text-green-700 uppercase mb-1">PrestigeSO Cevabı</p>
                  <p className="text-sm font-medium text-gray-700">{m.answer}</p>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-orange-500 bg-orange-50 w-max px-3 py-1 rounded-full">
                  <span className="animate-pulse">⏳</span>
                  <p className="text-[10px] font-black uppercase">Cevap Bekleniyor...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}