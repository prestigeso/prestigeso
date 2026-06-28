"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg("Lütfen zorunlu alanları doldurun.");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Mesaj gönderilemedi.");
      }

      setIsSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Mesaj gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            İletişim
          </h1>

          <Link
            href="/"
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>

        <div className="space-y-10">
          <section>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium">
              PrestigeSO ile ilgili soru, öneri, sipariş, teslimat, iade ve destek
              talepleriniz için aşağıdaki iletişim kanallarından bize ulaşabilirsiniz.
              En kısa sürede dönüş sağlamaya çalışırız.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                📍
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                Adres
              </h2>

              <p className="text-sm font-medium text-gray-600 leading-relaxed">
                Sultangazi / İstanbul
              </p>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                📞
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                Telefon
              </h2>

              <a
                href="tel:+905536834997"
                className="text-sm font-black text-black border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors"
              >
                0553 683 49 97
              </a>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                ✉️
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                E-posta
              </h2>

              <a
                href="mailto:info@prestigeso.com"
                className="text-sm font-black text-black border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors"
              >
                info@prestigeso.com
              </a>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-lg mb-4">
                🕒
              </div>

              <h2 className="text-xs font-black uppercase tracking-widest text-black mb-2">
                Destek Saatleri
              </h2>

              <p className="text-sm font-medium text-gray-600 leading-relaxed">
                Pazartesi - Cumartesi
                <br />
                09:00 - 18:00
              </p>
            </div>
          </section>

          <section className="bg-gray-50 border border-gray-100 rounded-3xl p-6 md:p-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-black mb-6 border-l-4 border-black pl-3">
              Bize Yazın
            </h2>

            {isSent ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  ✅
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-black mb-2">
                  Mesajınız İletildi
                </h3>
                <p className="text-sm font-medium text-gray-500 mb-6">
                  En kısa sürede dönüş sağlayacağız. Teşekkür ederiz.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSent(false)}
                  className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black hover:text-gray-500 hover:border-gray-500 transition-colors"
                >
                  Yeni Mesaj Gönder
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      Adınız Soyadınız *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Adınızı giriniz"
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      E-posta Adresiniz *
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={150}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-posta adresiniz"
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Konu
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Sipariş, iade, ürün sorusu vb."
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                    Mesajınız *
                  </label>
                  <textarea
                    required
                    rows={5}
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mesajınızı yazınız..."
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black transition-all text-sm"
                  />
                </div>

                {errorMsg && (
                  <p className="text-red-500 text-xs font-bold text-center">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl hover:bg-gray-900 active:scale-95 transition-all"
                >
                  {isSending ? "Gönderiliyor..." : "Mesajı Gönder 📨"}
                </button>
              </form>
            )}
          </section>

          <section className="bg-black text-white p-8 md:p-10 rounded-3xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

            <div className="relative z-10 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
                Sipariş ve Destek Talepleri
              </h2>

              <p className="text-sm md:text-base leading-relaxed font-medium opacity-90">
                Siparişleriniz, ürünler, teslimat, iade ve destek talepleriniz için
                profil sayfanızdaki "Satıcıya Mesaj Gönder" alanını da kullanabilirsiniz.
              </p>

              <Link
                href="/profile"
                className="inline-flex bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
              >
                Profilime Git
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}