import Link from "next/link";
import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";

export default function DistanceSellingPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] py-16 px-4 font-sans text-[#333]">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b border-gray-100 pb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black">
            Mesafeli Satış Sözleşmesi
          </h1>
          <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
            ← Ana Sayfaya Dön
          </Link>
        </div>
        
        {/* Yazdığımız Bileşeni Buraya Çağırıyoruz! */}
        <DistanceSellingContract />
        
      </div>
    </div>
  );
}