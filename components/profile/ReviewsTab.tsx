import Link from "next/link";

export default function ReviewsTab({ reviews }: { reviews: any[] }) {
  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
        Değerlendirmelerim
      </h3>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">⭐</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
            Henüz bir ürün değerlendirmesi yapmadınız.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const prod = rev.products;
            const displayImage = prod?.images?.[0] || prod?.image || "/logo.jpeg";

            return (
              <div key={rev.id} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col md:flex-row gap-4">
                <Link
                  href={`/product/${rev.product_id}`}
                  className="w-full md:w-24 h-24 bg-white rounded-xl border border-gray-200 flex-shrink-0 overflow-hidden group"
                >
                  <img
                    src={displayImage}
                    alt=""
                    className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform"
                  />
                </Link>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm text-black">
                      {prod?.name || "Bilinmeyen Ürün"}
                    </h4>
                    {rev.is_approved ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        Yayında
                      </span>
                    ) : (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        Onay Bekliyor
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-400 text-xs">
                      {"★".repeat(rev.rating)}
                      {"☆".repeat(5 - rev.rating)}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">
                      {new Date(rev.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 font-medium mb-3">{rev.comment}</p>

                  {rev.images && rev.images.length > 0 && (
                    <div className="flex gap-2">
                      {rev.images.map((img: string, i: number) => (
                        <img
                          key={i}
                          src={img}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                          alt="Yorum foto"
                        />
                      ))}
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