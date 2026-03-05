"use client";

import type { MessageRow } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;

  // data
  messages: MessageRow[];

  // reply state (parent'ta tutuluyor)
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;

  replyText: string;
  setReplyText: (v: string) => void;

  // action
  onSendReply: (messageId: number) => void;
};

export default function MessagesModal({
  open,
  onClose,
  messages,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  onSendReply,
}: Props) {
  if (!open) return null;

  const handleClose = () => {
    setReplyingTo(null);
    setReplyText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <span>✉️</span> Müşteri Mesajları
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
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-10 uppercase tracking-widest text-xs">
              Henüz mesaj yok.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-2xl border ${
                  msg.answer
                    ? "bg-gray-50 border-gray-100"
                    : "bg-white border-blue-200 shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      {msg.user_email}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400">
                      {new Date(msg.created_at).toLocaleString("tr-TR")}
                    </p>
                  </div>

                  {!msg.answer && (
                    <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-[9px] font-black uppercase">
                      Cevap Bekliyor
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-black mt-2 bg-gray-100/50 p-3 rounded-xl">
                  {msg.message}
                </p>

                {msg.answer ? (
                  <div className="mt-4 pl-4 border-l-2 border-black bg-white p-3 rounded-r-xl">
                    <p className="text-[9px] font-black uppercase text-green-600 tracking-widest mb-1">
                      Cevabınız:
                    </p>
                    <p className="text-sm text-gray-700 font-medium">{msg.answer}</p>
                  </div>
                ) : (
                  <div className="mt-4">
                    {replyingTo === msg.id ? (
                      <div className="space-y-2 animate-in fade-in">
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Müşteriye cevabınızı yazın..."
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black resize-none"
                        />

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onSendReply(msg.id)}
                            className="flex-1 bg-black text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest"
                          >
                            Gönder 🚀
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                            className="px-4 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg.id);
                          setReplyText("");
                        }}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                      >
                        Cevapla ↩
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}