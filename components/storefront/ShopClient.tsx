"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";
import { safeParseIds, sanitizeImageUrl } from "@/lib/utils";
import { getEffectiveUnitPrice } from "@/lib/commerce/pricing";

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

type ShopClientProps = {
  initialProducts: Product[];
  initialCampaigns: Campaign[];
  initialCategories: string[];
  query: string;
  category: string;
  sort: string;
  page: number;
  pageSize: number;
  total: number;
  minPrice: number | null;
  maxPrice: number | null;
  discounted: boolean;
  bestseller: boolean;
  minRating: number | null;
  availability: string;
  option: string;
  variantOptions: string[];
};

export default function ShopPage({
  initialProducts,
  initialCampaigns,
  initialCategories,
  query,
  category,
  sort,
  page,
  pageSize,
  total,
  minPrice,
  maxPrice,
  discounted,
  bestseller,
  minRating,
  availability,
  option,
  variantOptions,
}: ShopClientProps) {
  const router = useRouter();
  const { showToast } = useAppAlert();
  const [searchInput, setSearchInput] = useState(query);

  const dbProducts = initialProducts;
  const dbCampaigns = initialCampaigns;
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const categories = initialCategories;

  useEffect(() => {
    const loadAccount = async () => {
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
          () =>
            new Set(
              (favData || []).map((fav: { product_id: number }) =>
                Number(fav.product_id),
              ),
            ),
        );
      } else {
        setAuthUserId(null);
        setFavoriteIds(() => new Set());
      }
    };

    void loadAccount();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildHref = (overrides: {
    q?: string;
    category?: string;
    sort?: string;
    page?: number;
    minPrice?: number | null;
    maxPrice?: number | null;
    discounted?: boolean;
    bestseller?: boolean;
    minRating?: number | null;
    availability?: string;
    option?: string;
  }) => {
    const next = new URLSearchParams();
    const nextQuery = overrides.q ?? query;
    const nextCategory = overrides.category ?? category;
    const nextSort = overrides.sort ?? sort;
    const nextPage = overrides.page ?? page;
    const nextMinPrice = overrides.minPrice ?? minPrice;
    const nextMaxPrice = overrides.maxPrice ?? maxPrice;
    const nextDiscounted = overrides.discounted ?? discounted;
    const nextBestseller = overrides.bestseller ?? bestseller;
    const nextMinRating = overrides.minRating ?? minRating;
    const nextAvailability = overrides.availability ?? availability;
    const nextOption = overrides.option ?? option;
    if (nextQuery) next.set("q", nextQuery);
    if (nextCategory) next.set("category", nextCategory);
    if (nextSort !== "newest") next.set("sort", nextSort);
    if (nextPage > 1) next.set("page", String(nextPage));
    if (nextMinPrice !== null) next.set("minPrice", String(nextMinPrice));
    if (nextMaxPrice !== null) next.set("maxPrice", String(nextMaxPrice));
    if (nextDiscounted) next.set("discounted", "1");
    if (nextBestseller) next.set("bestseller", "1");
    if (nextMinRating !== null) next.set("minRating", String(nextMinRating));
    if (nextAvailability !== "in-stock")
      next.set("availability", nextAvailability);
    if (nextOption) next.set("option", nextOption);
    const value = next.toString();
    return value ? `/shop?${value}` : "/shop";
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildHref({ q: searchInput.trim(), page: 1 }));
  };

  const handleToggleFavorite = async (
    productId: number,
    isCurrentlyFavorite: boolean,
  ) => {
    if (!authUserId) {
      showToast(
        "Ürünleri favorilemek için lütfen önce giriş yapın.",
        "warning",
      );
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
            TÜM ÜRÜNLER <span className="text-gray-300 ml-2">[{total}]</span>
          </h1>

          <form
            onSubmit={handleSearch}
            className="flex w-full md:max-w-sm gap-2"
          >
            <label htmlFor="shop-search" className="sr-only">
              Ürün ara
            </label>
            <input
              id="shop-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Ürün veya kategori ara"
              maxLength={80}
              className="min-w-0 flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-black"
            />
            <button
              type="submit"
              className="rounded-full bg-black px-5 py-2 text-xs font-black uppercase tracking-widest text-white"
            >
              Ara
            </button>
          </form>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={buildHref({
                  category: cat === "Tümü" ? "" : cat,
                  page: 1,
                })}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  (category || "Tümü") === cat
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-end md:justify-between">
          <form method="get" className="flex flex-wrap items-end gap-3">
            {query && <input type="hidden" name="q" value={query} />}
            {category && <input type="hidden" name="category" value={category} />}
            {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
            <label className="text-[10px] font-black uppercase text-gray-500">
              Min. fiyat
              <input name="minPrice" type="number" min="0" defaultValue={minPrice ?? ""} className="mt-1 block w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-[10px] font-black uppercase text-gray-500">
              Maks. fiyat
              <input name="maxPrice" type="number" min="0" defaultValue={maxPrice ?? ""} className="mt-1 block w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold">
              <input name="discounted" value="1" type="checkbox" defaultChecked={discounted} /> İndirimli
            </label>
            <label className="flex items-center gap-2 text-xs font-bold">
              <input name="bestseller" value="1" type="checkbox" defaultChecked={bestseller} /> Çok satan
            </label>
            <label className="text-[10px] font-black uppercase text-gray-500">
              En az puan
              <select
                name="minRating"
                defaultValue={minRating ?? ""}
                className="mt-1 block rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">Tümü</option>
                {[4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}+ yıldız
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-black uppercase text-gray-500">
              Stok durumu
              <select
                name="availability"
                defaultValue={availability}
                className="mt-1 block rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="in-stock">Stokta</option>
                <option value="out-of-stock">Tükenen</option>
                <option value="all">Tümü</option>
              </select>
            </label>
            {variantOptions.length > 0 && (
              <label className="text-[10px] font-black uppercase text-gray-500">
                Ürün özelliği
                <select
                  name="option"
                  defaultValue={option}
                  className="mt-1 block rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Tümü</option>
                  {variantOptions.map((value) => (
                    <option key={value} value={value}>
                      {value.replace(":", ": ")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="rounded-xl bg-black px-4 py-2 text-xs font-black uppercase text-white">Filtrele</button>
            <Link href="/shop" className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black uppercase">Temizle</Link>
          </form>
          <label htmlFor="shop-sort" className="sr-only">
            Ürün sıralaması
          </label>
          <select
            id="shop-sort"
            value={sort}
            onChange={(event) =>
              router.push(buildHref({ sort: event.target.value, page: 1 }))
            }
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold"
          >
            <option value="newest">En yeniler</option>
            <option value="price-asc">Fiyat: artan</option>
            <option value="price-desc">Fiyat: azalan</option>
            <option value="name">Ada göre</option>
          </select>
        </div>

        {dbProducts.length === 0 ? (
          <div className="py-20 text-center font-bold text-gray-300 uppercase tracking-widest">
            Ürün bulunamadı.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {dbProducts.map((product) => (
                <ShopCard
                  key={product.id}
                  product={product}
                  campaigns={dbCampaigns}
                  isFavorite={favoriteIds.has(Number(product.id))}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <nav
                className="mt-10 flex items-center justify-center gap-3"
                aria-label="Ürün sayfaları"
              >
                {page > 1 && (
                  <Link
                    href={buildHref({ page: page - 1 })}
                    className="rounded-full border border-gray-200 px-5 py-3 text-xs font-black uppercase"
                  >
                    Önceki
                  </Link>
                )}
                <span className="text-xs font-bold text-gray-500">
                  Sayfa {Math.min(page, totalPages)} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: page + 1 })}
                    className="rounded-full bg-black px-5 py-3 text-xs font-black uppercase text-white"
                  >
                    Sonraki
                  </Link>
                )}
              </nav>
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
  const activePrice = getEffectiveUnitPrice({
    basePrice: originalPrice,
    discountPrice: product.discount_price,
    campaignPercent: activeCampaign?.discount_percent,
  });
  const hasPriceDiscount = activePrice < originalPrice;

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

        {hasPriceDiscount ? (
          <div className="absolute bottom-0 w-full bg-red-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-10">
            {activeCampaign
              ? `%${activeCampaign.discount_percent} İNDİRİM`
              : "İNDİRİM"}
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

      {hasPriceDiscount ? (
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
