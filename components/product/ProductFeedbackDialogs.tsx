"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";

type Props = {
  reviewOpen: boolean;
  questionOpen: boolean;
  rating: number;
  comment: string;
  question: string;
  previews: string[];
  isSubmitting: boolean;
  onReviewClose: () => void;
  onQuestionClose: () => void;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onQuestionChange: (question: string) => void;
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onReviewSubmit: (event: FormEvent) => void;
  onQuestionSubmit: (event: FormEvent) => void;
};

export default function ProductFeedbackDialogs(props: Props) {
  return (
    <>
      {props.reviewOpen && (
        <Dialog title="Değerlendir" onClose={props.onReviewClose}>
          <form onSubmit={props.onReviewSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Puanınız
              </label>
              <div className="flex gap-2 text-3xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => props.onRatingChange(star)}
                    className={`transition-colors ${star <= props.rating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Yorumunuz
              </label>
              <textarea
                required
                rows={4}
                value={props.comment}
                onChange={(event) => props.onCommentChange(event.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none"
                placeholder="Ürün beklentilerinizi karşıladı mı?"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Fotoğraf Ekle (Opsiyonel)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={props.onFilesChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-black cursor-pointer"
              />
              {props.previews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                  {props.previews.map((url) => (
                    <div
                      key={url}
                      className="w-16 h-16 rounded-lg border border-gray-200 relative shrink-0 overflow-hidden"
                    >
                      <Image
                        unoptimized
                        src={url}
                        fill
                        sizes="64px"
                        className="object-cover"
                        alt="Yorum önizlemesi"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <SubmitButton loading={props.isSubmitting} label="Yorumu Gönder" />
          </form>
        </Dialog>
      )}
      {props.questionOpen && (
        <Dialog title="Soru Sor" onClose={props.onQuestionClose}>
          <form onSubmit={props.onQuestionSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Sorunuz
              </label>
              <textarea
                required
                rows={4}
                value={props.question}
                onChange={(event) => props.onQuestionChange(event.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none"
                placeholder="Ürün ölçüleri, materyali vb. konularda satıcıya sorun..."
              />
            </div>
            <SubmitButton loading={props.isSubmitting} label="Soruyu İlet" />
          </form>
        </Dialog>
      )}
    </>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-2 disabled:opacity-60"
    >
      {loading ? "Gönderiliyor..." : label}
    </button>
  );
}
