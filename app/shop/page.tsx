"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useSearch } from "@/context/SearchContext";
import { useAppAlert } from "@/context/AppAlertContext";
import { safeParseIds, sanitizeImageUrl } from "@/lib/utils";

import type { Product, Campaign } from "@/types";

function getActiveCampaign(productId: number | string, campaigns: Campaign[]) {
  const now = new Date();

  return campaigns.find((campaign) => {
    const ids = safeParseIds(campaign.product_ids);

    return (
      ids.includes(Number(productId)) &&
      now >= new Date(campaign.start_date) &&
      now <= new Date(campaign.end_date)
    );
  });
}

export default function ShopPage() {
  const { searchQuery, selectedCategory, setSelectedCategory } = useSearch();
  const { showToast } = useAppAlert();

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCampaigns, setDbCampaigns] = useState<Campaign[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);

  const categories = [
    "Tümü",
    "Setler",
    "Masa Süsleri",
    "Kolyeler",
    "Yüzükler",
    "Bilezikler",
    "Küpeler",
    "Tespihler",
  ];

  useEffect(() => {
    const fetchShopData = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setAuthUserId(session.user.id);

        const { data: favData } = await supabase
          .from("favorites")
          .select("product_id")
          .eq("user_id", session.user.id);

        setFavoriteIds(
          () => new Set((favData || []).map((fav: any) => Number(fav.product_id)))
        );
      } else {
        setAuthUserId(null);
        setFavoriteIds(() => new Set());
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .gt("stock", 0)
        .order("created_at", { ascending: false });

      if (!productsError && productsData) {
        setDbProducts(productsData as Product[]);
      } else {
        setDbProducts([]);
      }

      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .gte("end_date", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (!campaignsError && campaignsData) {
        setDbCampaigns(campaignsData as Campaign[]);
      } else {
        setDbCampaigns([]);
      }

      setLoading(false);
    };

    fetchShopData();
  }, []);

  const filteredProducts = useMemo(() => {
    // FEAT-05: Kategori/arama değişince sayfalamayı sıfırla
    setVisibleCount(20);
    return dbProducts.filter((product) => {
      const matchCategory =
        selectedCategory === "Tümü" || product.category === selectedCategory;

      const query = (searchQuery || "").toLowerCase().trim();

      const matchSearch =
        query === "" ||
        (product.name || "").toLowerCase().includes(query) ||
        (product.category || "").toLowerCase().includes(query);

      return matchCategory && matchSearch;
    });
  }, [dbProducts, selectedCategory, searchQuery]);

  const paginatedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const handleToggleFavorite = async (
    productId: number,
    isCurrentlyFavorite: boolean
  ) => {
    if (!authUserId) {
      showToast("Ürünleri favorilemek için lütfen önce giriş yapın.", "warning");
      return;
    }

    if (isCurrentlyFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", authUserId)
        .eq("product_id", productId);

      if (error) {
        showToast("Favorilerden kaldırılırken bir hata oluştu.", "error");
        return;
      }

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });

      showToast("Ürün favorilerden kaldırıldı.", "success");
      return;
    }

    const { error } = await supabase
      .from("favorites")
      .insert([{ user_id: authUserId, product_id: productId }]);

    if (error) {
      showToast("Favorilere eklenirken bir hata oluştu.", "error");
      return;
    }

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });

    showToast("Ürün favorilere eklendi.", "success");
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-gray-100 pb-8 gap-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-black">
            TÜM ÜRÜNLER{" "}
            <span className="text-gray-300 ml-2">[{filteredProducts.length}]</span>
          </h1>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  selectedCategory === cat
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-bold text-gray-300 uppercase tracking-widest">
            Koleksiyon Hazırlanıyor...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center font-bold text-gray-300 uppercase tracking-widest">
            Ürün bulunamadı.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {paginatedProducts.map((product) => (
                <ShopCard
                  key={product.id}
                  product={product}
                  campaigns={dbCampaigns}
                  isFavorite={favoriteIds.has(Number(product.id))}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 20)}
                  className="bg-black text-white px-10 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                >
                  Daha Fazla Göster ({filteredProducts.length - visibleCount} ürün kaldı)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ShopCard({
  product,
  campaigns,
  isFavorite,
  onToggleFavorite,
}: {
  product: Product;
  campaigns: Campaign[];
  isFavorite: boolean;
  onToggleFavorite: (productId: number, isCurrentlyFavorite: boolean) => void;
}) {
  const displayImage = sanitizeImageUrl(product.images?.[0] || product.image);
  const activeCampaign = getActiveCampaign(product.id, campaigns);

  const originalPrice = Number(product.price || 0);
  const activePrice = activeCampaign
    ? originalPrice * (1 - Number(activeCampaign.discount_percent || 0) / 100)
    : originalPrice;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(Number(product.id), isFavorite);
  };

  return (
    <Link href={`/product/${product.id}`} className="group block relative">
      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 relative mb-3">
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 z-20 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform text-lg"
          title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
          aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>

        <Image
          src={displayImage}
          alt={product.name || "Ürün"}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
        />

        {activeCampaign ? (
          <div className="absolute bottom-0 w-full bg-red-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-10">
            %{activeCampaign.discount_percent} İNDİRİM
          </div>
        ) : product.is_bestseller ? (
          <div className="absolute bottom-0 w-full bg-black text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-10">
            Çok Satan
          </div>
        ) : null}
      </div>

      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
        {product.category}
      </p>

      <h3 className="text-sm font-bold text-black line-clamp-1 mb-1">
        {product.name}
      </h3>

      {activeCampaign ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold text-gray-400 line-through leading-none">
            {originalPrice.toLocaleString("tr-TR")} ₺
          </p>
          <p className="text-lg font-black text-red-600 leading-none">
            {activePrice.toLocaleString("tr-TR")} ₺
          </p>
        </div>
      ) : (
        <p className="text-lg font-black text-black">
          {activePrice.toLocaleString("tr-TR")} ₺
        </p>
      )}
    </Link>
  );
}
