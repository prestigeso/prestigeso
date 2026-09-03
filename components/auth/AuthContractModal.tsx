"use client";

import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";
import type { ContractModalType } from "@/lib/auth/registration";

type ModalType = Exclude<ContractModalType, null>;

export default function AuthContractModal({
  active,
  onClose,
  onApprove,
}: {
  active: ModalType;
  onClose: () => void;
  onApprove: (type: ModalType) => void;
}) {
  const title = {
    terms: "Üyelik Sözleşmesi",
    distance: "Mesafeli Satış Sözleşmesi",
    aydinlatma: "Aydınlatma Metni",
    privacy: "Gizlilik Politikası",
  }[active];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in md:p-8">
        <div className="mb-6 flex shrink-0 items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-lg font-black uppercase tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sözleşmeyi kapat"
            className="h-8 w-8 rounded-full bg-gray-100 font-bold hover:bg-gray-200"
          >
            ×
          </button>
        </div>
        <div className="custom-scrollbar overflow-y-auto pr-2 text-sm font-medium leading-relaxed text-gray-600">
          {active === "distance" && <DistanceSellingContract />}
          {active === "terms" && (
            <div className="space-y-4">
              <p>
                <strong className="text-black">1. Taraflar:</strong> Bu sözleşme
                Prestigeso.com.tr ile üye olan kullanıcı arasındadır.
              </p>
              <p>
                <strong className="text-black">2. Üye Hesabı:</strong> Her üye
                sadece bir hesaba sahip olabilir. Şifre güvenliğinden üye
                sorumludur.
              </p>
              <p>
                <strong className="text-black">3. Sorumluluk:</strong> Site
                içindeki materyallerin izinsiz kullanımı yasaktır.
              </p>
              <p>
                Daha detaylı bilgi için sitemizin alt kısmındaki yasal sayfaları
                ziyaret edebilirsiniz.
              </p>
            </div>
          )}
          {active === "privacy" && (
            <div className="space-y-4">
              <p>
                <strong className="text-black">
                  1. Topladığımız Bilgiler:
                </strong>{" "}
                Hizmet sunabilmek için kimlik, iletişim, cihaz ve çerez
                bilgileri toplanmaktadır.
              </p>
              <p>
                <strong className="text-black">2. Veri Güvenliği:</strong>{" "}
                Verileriniz ilgili mevzuata uygun şekilde güvenli sunucularda
                saklanmakta ve korunmaktadır.
              </p>
              <p>
                Haklarınızı kullanmak için{" "}
                <strong className="text-black">info@prestigeso.com.tr</strong>{" "}
                üzerinden bizimle iletişime geçebilirsiniz.
              </p>
            </div>
          )}
          {active === "aydinlatma" && (
            <div className="space-y-4">
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca kişisel
                verileriniz veri sorumlusu sıfatıyla firmamız tarafından
                işlenmektedir.
              </p>
              <p>
                Kayıt sırasında alınan iletişim bilgileriniz, siparişlerin
                ulaştırılması, üyelik hizmetlerinin sunulması, müşteri desteği,
                yasal yükümlülükler ve işlem güvenliği amaçlarıyla
                kullanılmaktadır.
              </p>
              <p>
                Kampanya ve ticari elektronik ileti gönderimi yalnızca kayıt
                ekranındaki ayrı ve isteğe bağlı izin verilmişse yapılır. Bu
                izin üyeliğin şartı değildir ve hesap ayarlarından geri
                çekilebilir.
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 flex shrink-0 justify-end border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() =>
              active === "terms" || active === "distance"
                ? onApprove(active)
                : onClose()
            }
            className="rounded-xl bg-black px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:bg-gray-900"
          >
            {active === "terms" || active === "distance"
              ? "Kabul Ediyorum"
              : "Kapat"}
          </button>
        </div>
      </div>
    </div>
  );
}
