import Link from "next/link";

export default function FavoritesTab({ favorites, removeFavorite }: { favorites: any[], removeFavorite: (id: string) => void }) {
  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-50 pb-4">
        Favori Ürünlerim
      </h3>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">❤️</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Favori listeniz şu an boş.</p>
          <Link href="/" className="mt-6 bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-gray-800 transition-all">
            Keşfetmeye Başla
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((product) => {
             const displayImage = product.images?.[0] || product.image || "/logo.jpeg";
             const activePrice = Number(product.discount_price) > 0 ? Number(product.discount_price) : Number(product.price);
             
             return (
                 <Link href={`/product/${product.id}`} key={product.id} className="group relative block w-full h-full flex flex-col border border-gray-100 p-2 rounded-2xl hover:border-black transition-all">
                     <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-50 relative mb-3">
                         <img src={displayImage} alt="" className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform" />
                         <button 
                             onClick={(e) => { e.preventDefault(); removeFavorite(product.id); }}
                             className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full shadow-sm flex items-center justify-center text-black hover:scale-110 active:scale-95 z-10"
                         >
                             ✕
                         </button>
                     </div>
                     <div className="px-1 flex-1 flex flex-col">
                         <h4 className="font-bold text-xs uppercase truncate text-black mb-1">{product.name}</h4>
                         <p className="text-sm font-black text-black mt-auto">{activePrice.toLocaleString("tr-TR")} ₺</p>
                     </div>
                 </Link>
             )
          })}
        </div>
      )}
    </div>
  );
}