import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "PrestigeSO kişisel verilerin korunması ve çerez kullanımı aydınlatma metni.",
};

export default function KvkkPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-14 text-black">
      <article className="mx-auto max-w-3xl rounded-3xl border border-gray-100 bg-white p-7 shadow-sm md:p-12">
        <h1 className="text-3xl font-black uppercase tracking-tight">
          KVKK Aydınlatma Metni
        </h1>
        <p className="mt-3 text-sm leading-7 text-gray-600">
          PrestigeSO; hesap oluşturma, sipariş, teslimat, ödeme, destek ve site
          güvenliği süreçlerinde paylaştığınız kişisel verileri 6698 sayılı
          Kişisel Verilerin Korunması Kanunu kapsamında işler.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="font-black uppercase text-black">
              Toplanan Veriler ve Amaçlar
            </h2>
            <p>
              Kimlik ve iletişim bilgileri, teslimat adresi, sipariş hareketleri
              ve teknik güvenlik kayıtları; siparişin kurulması ve ifası, kargo
              teslimi, müşteri desteği, yasal yükümlülükler ve dolandırıcılığın
              önlenmesi amaçlarıyla kullanılır. Kart bilgileriniz PrestigeSO
              tarafından saklanmaz; ödeme işlemi ödeme kuruluşu tarafından
              yürütülür.
            </p>
          </section>
          <section>
            <h2 className="font-black uppercase text-black">
              Aktarım ve Saklama
            </h2>
            <p>
              Veriler yalnızca hizmetin gerektirdiği ölçüde ödeme, kargo,
              e-posta ve altyapı hizmeti sağlayıcılarıyla veya kanunen yetkili
              kurumlarla paylaşılabilir. Veriler, işleme amacı ve yasal saklama
              süresi sona erdiğinde silinir, yok edilir veya anonimleştirilir.
            </p>
          </section>
          <section>
            <h2 className="font-black uppercase text-black">Çerezler</h2>
            <p>
              Zorunlu çerezler oturum, sepet ve güvenlik işlevleri için
              kullanılır. Tarayıcı ayarlarınızdan çerezleri silebilir veya
              engelleyebilirsiniz; bu durumda bazı site işlevleri
              çalışmayabilir.
            </p>
          </section>
          <section>
            <h2 className="font-black uppercase text-black">Haklarınız</h2>
            <p>
              KVKK’nın 11. maddesi kapsamında verilerinizin işlenip
              işlenmediğini öğrenme, bilgi ve düzeltme isteme, şartları
              oluştuğunda silme veya yok etme talep etme ve hukuka aykırı işleme
              nedeniyle zararın giderilmesini isteme haklarına sahipsiniz.
            </p>
          </section>
          <section>
            <h2 className="font-black uppercase text-black">İletişim</h2>
            <p>
              Taleplerinizi kimliğinizi doğrulamaya elverişli bilgilerle
              birlikte{" "}
              <a
                className="font-bold underline"
                href="mailto:info@prestigeso.com.tr"
              >
                info@prestigeso.com.tr
              </a>{" "}
              adresine iletebilirsiniz.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
