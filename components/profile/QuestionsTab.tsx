import Link from "next/link";

export default function QuestionsTab({ questions }: { questions: any[] }) {
  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
        Ürün Sorularım
      </h3>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">💬</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
            Satıcılara henüz soru sormadınız.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const prod = q.products;
            const displayImage = prod?.images?.[0] || prod?.image || "/logo.jpeg";

            return (
              <div key={q.id} className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 shadow-sm hover:border-black transition-all">
                <Link
                  href={`/product/${q.product_id}`}
                  className="w-full md:w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 flex-shrink-0 overflow-hidden group"
                >
                  <img
                    src={displayImage}
                    alt=""
                    className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform"
                  />
                </Link>

                <div className="flex-1">
                  <h4 className="font-bold text-xs text-gray-500 mb-2 truncate">
                    {prod?.name || "Bilinmeyen Ürün"}
                  </h4>

                  <div className="mb-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sorunuz:</p>
                    <p className="text-sm font-bold text-black">{q.question}</p>
                  </div>

                  {q.answer ? (
                    <div className="pl-4 border-l-2 border-green-500 bg-green-50/50 p-3 rounded-r-xl mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Satıcı Cevabı</p>
                        <span className="text-[9px] text-gray-400 font-bold">
                          {q.answered_at ? new Date(q.answered_at).toLocaleDateString("tr-TR") : ""}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{q.answer}</p>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg border border-orange-100 mt-2">
                      <span className="animate-pulse">⏳</span>
                      <p className="text-[10px] font-black uppercase tracking-widest">Satıcı Cevabı Bekleniyor...</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}