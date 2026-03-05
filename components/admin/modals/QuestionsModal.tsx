"use client";

import type { QuestionRow } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;

  // data
  questions: QuestionRow[];

  // reply state (parent'ta)
  replyingToQ: number | null;
  setReplyingToQ: (id: number | null) => void;

  qReplyText: string;
  setQReplyText: (v: string) => void;

  // actions
  onSendReply: (questionId: number) => void;
  onToggleApproval: (questionId: number, currentStatus: boolean) => void;
};

export default function QuestionsModal({
  open,
  onClose,
  questions,

  replyingToQ,
  setReplyingToQ,

  qReplyText,
  setQReplyText,

  onSendReply,
  onToggleApproval,
}: Props) {
  if (!open) return null;

  const handleClose = () => {
    setReplyingToQ(null);
    setQReplyText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <span>💬</span> Ürün Soruları
          </h2>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 flex-1 pr-2">
          {questions.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-10 uppercase tracking-widest text-xs">
              Henüz soru yok.
            </p>
          ) : (
            questions.map((q) => {
              const displayImage =
                q.products?.images?.[0] || q.products?.image || "/logo.jpeg";

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 ${
                    q.answer
                      ? "bg-gray-50 border-gray-100"
                      : "bg-white border-orange-200 shadow-sm"
                  }`}
                >
                  {/* Product */}
                  <div className="w-full md:w-24 flex-shrink-0 flex flex-col items-center gap-2">
                    <div className="w-20 h-20 bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <img
                        src={displayImage}
                        alt=""
                        className="w-full h-full object-cover mix-blend-multiply"
                      />
                    </div>
                    <p className="text-[9px] font-black uppercase text-center truncate w-full text-gray-500">
                      {q.products?.name || "Bilinmeyen"}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[9px] font-bold text-gray-400 mt-1">
                        {new Date(q.created_at).toLocaleString("tr-TR")}
                      </p>

                      <div className="flex items-center gap-2">
                        {q.answer ? (
                          <button
                            type="button"
                            onClick={() => onToggleApproval(q.id, !!q.is_approved)}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                              q.is_approved
                                ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
                            }`}
                            title="Yayın durumunu değiştir"
                          >
                            {q.is_approved ? "👁️ Yayında" : "👁️‍🗨️ Gizli"}
                          </button>
                        ) : (
                          <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-orange-200">
                            Cevap Bekliyor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question */}
                    <p className="text-sm font-bold text-black bg-gray-100/50 p-3 rounded-xl border-l-4 border-black">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">
                        Müşteri Sorusu:
                      </span>
                      {q.question}
                    </p>

                    {/* Answer or Reply Box */}
                    {q.answer ? (
                      <div className="mt-3 pl-4 border-l-4 border-green-500 bg-green-50/50 p-3 rounded-r-xl">
                        <p className="text-[9px] font-black uppercase text-green-700 tracking-widest mb-1">
                          Satıcı Cevabı:
                        </p>
                        <p className="text-sm text-gray-700 font-medium">{q.answer}</p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        {replyingToQ === q.id ? (
                          <div className="space-y-2 animate-in fade-in">
                            <textarea
                              rows={3}
                              value={qReplyText}
                              onChange={(e) => setQReplyText(e.target.value)}
                              placeholder="Müşteriye asil cevabınızı yazın..."
                              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black resize-none"
                            />

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => onSendReply(q.id)}
                                className="flex-1 bg-black text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800"
                              >
                                Gönder 🚀
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToQ(null);
                                  setQReplyText("");
                                }}
                                className="px-4 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase hover:bg-gray-200"
                              >
                                İptal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToQ(q.id);
                              setQReplyText("");
                            }}
                            className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-colors"
                          >
                            Soruya Cevap Ver ↩
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}