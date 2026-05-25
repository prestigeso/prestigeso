"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";

import type { Slide } from "./types";
import { uploadToStorageAndGetPublicUrl, revokeUrls } from "./utils";

import { useAdminData } from "./hooks/useAdminData";
import { useAdminNotifications } from "./hooks/useAdminNotifications";

import { HeaderBar, AdminNav, ProductList } from "./parts";
import {
  AddProductModal,
  EditProductModal,
  CampaignModal,
  SettingsModal,
  MessagesModal,
  QuestionsModal,
  OrdersModal,
  ReviewsModal,
  PerformanceModal,
  AnalysisModal,
} from "./modals";

function normalizeSku(input: any) {
  return (input ?? "").toString().trim().toUpperCase();
}

export default function AdminPanel() {
  const { showToast, showConfirm } = useAppAlert();

  const activeMonth = new Date()
    .toLocaleString("tr-TR", { month: "long" })
    .toUpperCase();

  const {
    loading,

    dbProducts,
    dbSlides,
    dbCampaigns,
    dbMessages,
    dbQuestions,
    dbOrders,
    dbReviews,

    dbAllFavorites,
    dbProductViews,

    monthlyRevenue,
    monthlyOrders,
    monthlyVisits,

    allTimeRevenue,
    allTimeOrders,
    allTimeVisits,

    loadAllData,

    setDbSlides,
    setDbMessages,
    setDbQuestions,
    setDbOrders,
    setDbReviews,
  } = useAdminData();

  const [searchTerm, setSearchTerm] = useState("");
  const [stockTab, setStockTab] = useState<"all" | "in" | "out">("all");
  const [activeNavMenu, setActiveNavMenu] = useState<string | null>(null);

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [perfTab, setPerfTab] = useState<"favorites" | "views" | "reviews">(
    "favorites"
  );

  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<
    "revenue" | "orders" | "visits"
  >("revenue");

  const {
    unifiedNotifications,
    totalNotifications,
    unreadMessagesCount,
    unansweredQuestionsCount,
    pendingReviewsCount,
    pendingOrdersCount,
  } = useAdminNotifications({
    dbOrders,
    dbQuestions,
    dbReviews,
    dbMessages,
    dbProducts,

    onOpenOrders: () => {
      setIsNotificationsOpen(false);
      setIsOrdersOpen(true);
    },
    onOpenQuestions: () => {
      setIsNotificationsOpen(false);
      setIsQuestionsOpen(true);
    },
    onOpenReviews: () => {
      setIsNotificationsOpen(false);
      setIsReviewsOpen(true);
    },
    onOpenMessages: () => {
      setIsNotificationsOpen(false);
      setIsMessagesOpen(true);
    },
    onShowOutOfStock: () => {
      setIsNotificationsOpen(false);
      setStockTab("out");
    },
  });

  const [creating, setCreating] = useState(false);
  const [newProductFiles, setNewProductFiles] = useState<File[]>([]);
  const [newProductPreviews, setNewProductPreviews] = useState<string[]>([]);

  const moveNewImage = (index: number, direction: "left" | "right") => {
    const files = [...newProductFiles];
    const previews = [...newProductPreviews];

    if (direction === "left" && index > 0) {
      [files[index], files[index - 1]] = [files[index - 1], files[index]];
      [previews[index], previews[index - 1]] = [
        previews[index - 1],
        previews[index],
      ];
    }

    if (direction === "right" && index < files.length - 1) {
      [files[index], files[index + 1]] = [files[index + 1], files[index]];
      [previews[index], previews[index + 1]] = [
        previews[index + 1],
        previews[index],
      ];
    }

    setNewProductFiles(files);
    setNewProductPreviews(previews);
  };

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editAddFiles, setEditAddFiles] = useState<File[]>([]);
  const [editAddPreviews, setEditAddPreviews] = useState<string[]>([]);
  const [editAddUploading, setEditAddUploading] = useState(false);

  const moveEditImage = (index: number, direction: "left" | "right") => {
    if (!editingProduct) return;

    const images: string[] = Array.isArray(editingProduct.images)
      ? [...editingProduct.images]
      : [];

    if (direction === "left" && index > 0) {
      [images[index], images[index - 1]] = [images[index - 1], images[index]];
    }

    if (direction === "right" && index < images.length - 1) {
      [images[index], images[index + 1]] = [images[index + 1], images[index]];
    }

    setEditingProduct((prev: any) => ({
      ...prev,
      images,
      image: images[0] || "",
    }));
  };

  const removeImageFromGallery = (url: string) => {
    if (!editingProduct) return;

    const images: string[] = Array.isArray(editingProduct.images)
      ? editingProduct.images
      : [];

    const next = images.filter((x) => x !== url);

    setEditingProduct((prev: any) => ({
      ...prev,
      images: next,
      image: next[0] || "",
    }));
  };

  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const [replyingToQ, setReplyingToQ] = useState<number | null>(null);
  const [qReplyText, setQReplyText] = useState("");

  const [campaignName, setCampaignName] = useState("");
  const [selectedCampaignProducts, setSelectedCampaignProducts] = useState<
    number[]
  >([]);
  const [campaignDates, setCampaignDates] = useState({ start: "", end: "" });
  const [discountPercent, setDiscountPercent] = useState<number>(20);

  const [marquee, setMarquee] = useState("");

  const [newSlideFiles, setNewSlideFiles] = useState<File[]>([]);
  const [newSlidePreviews, setNewSlidePreviews] = useState<string[]>([]);
  const [newSlide, setNewSlide] = useState({ title: "", subtitle: "" });

  useEffect(() => {
    setMarquee(localStorage.getItem("prestigeso_campaign") || "");
  }, []);

  const favoritesRank = useMemo(() => {
    const favCounts = (dbAllFavorites || []).reduce((acc: any, curr: any) => {
      acc[curr.product_id] = (acc[curr.product_id] || 0) + 1;
      return acc;
    }, {});

    return (dbProducts || [])
      .map((p: any) => ({ ...p, count: favCounts[p.id] || 0 }))
      .filter((p: any) => p.count > 0)
      .sort((a: any, b: any) => b.count - a.count);
  }, [dbAllFavorites, dbProducts]);

  const viewsRank = useMemo(() => {
    const viewCounts = (dbProductViews || []).reduce((acc: any, curr: any) => {
      acc[curr.product_id] = (acc[curr.product_id] || 0) + 1;
      return acc;
    }, {});

    return (dbProducts || [])
      .map((p: any) => ({ ...p, count: viewCounts[p.id] || 0 }))
      .filter((p: any) => p.count > 0)
      .sort((a: any, b: any) => b.count - a.count);
  }, [dbProductViews, dbProducts]);

  const reviewsRank = useMemo(() => {
    return (dbProducts || [])
      .map((p: any) => {
        const pRevs = (dbReviews || []).filter(
          (r: any) => String(r.product_id) === String(p.id) && r.is_approved
        );

        const count = pRevs.length;
        const avg =
          count > 0
            ? pRevs.reduce((a: number, r: any) => a + r.rating, 0) / count
            : 0;

        return { ...p, ratingCount: count, ratingAvg: avg };
      })
      .filter((p: any) => p.ratingCount > 0)
      .sort(
        (a: any, b: any) =>
          b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount
      );
  }, [dbProducts, dbReviews]);

  const openEditProduct = async (id: number) => {
    setEditLoading(true);
    setEditingProduct(null);

    revokeUrls(editAddPreviews);
    setEditAddFiles([]);
    setEditAddPreviews([]);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    setEditLoading(false);

    if (error) {
      showToast("Ürün detayı çekilemedi: " + error.message, "error");
      return;
    }

    const row: any = data;
    const arr = Array.isArray(row.images) ? row.images : [];
    const normalizedImages = arr.length > 0 ? arr : row.image ? [row.image] : [];

    setEditingProduct({
      ...row,
      ["SKU"]: normalizeSku(row?.["SKU"]),
      images: normalizedImages,
      image: normalizedImages[0] || "",
    });
  };

  const handleAddMoreImagesToProduct = async () => {
    if (!editingProduct) return;

    if (editAddFiles.length === 0) {
      showToast("Eklemek için en az 1 fotoğraf seçin.", "warning");
      return;
    }

    setEditAddUploading(true);

    try {
      const urls: string[] = [];

      for (const file of editAddFiles) {
        const url = await uploadToStorageAndGetPublicUrl(file, "product_extra");
        urls.push(url);
      }

      const images: string[] = Array.isArray(editingProduct.images)
        ? editingProduct.images
        : [];

      const next = [...images, ...urls];

      setEditingProduct((prev: any) => ({
        ...prev,
        images: next,
        image: next[0] || "",
      }));

      revokeUrls(editAddPreviews);
      setEditAddFiles([]);
      setEditAddPreviews([]);

      showToast("Fotoğraflar eklendi. Kaydet butonuna basmayı unutmayın.", "success");
    } catch (err: any) {
      showToast("Fotoğraf eklenemedi: " + (err?.message || "Bilinmeyen hata"), "error");
    } finally {
      setEditAddUploading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingProduct) return;

    const sku = normalizeSku(editingProduct?.["SKU"]);

    if (!sku) {
      showToast("SKU zorunludur.", "warning");
      return;
    }

    setSaving(true);

    const images: string[] = Array.isArray(editingProduct.images)
      ? editingProduct.images
      : [];

    const payload: any = {
      ["SKU"]: sku,
      name: editingProduct.name,
      price: Number(editingProduct.price),
      category: editingProduct.category,
      stock: Number(editingProduct.stock ?? 0),
      is_bestseller: !!editingProduct.is_bestseller,
      description: editingProduct.description ?? "",
      images,
      image: images[0] || "",
      barcode: (editingProduct.barcode ?? "").toString().trim() || null,
    };

    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", editingProduct.id);

    setSaving(false);

    if (error) {
      showToast("Kaydetme hatası: " + error.message, "error");
      return;
    }

    showToast("Ürün kaydedildi.", "success");
    setEditingProduct(null);
    loadAllData();
  };

  const handleDeleteProduct = async (id: number) => {
    const ok = await showConfirm({
      title: "Ürün silinsin mi?",
      message: "Bu ürünü kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      showToast("Silinemedi: " + error.message, "error");
      return;
    }

    showToast("Ürün silindi.", "success");
    setEditingProduct(null);
    loadAllData();
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;

    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const sku = normalizeSku(
      (form.elements.namedItem("sku") as HTMLInputElement).value
    );

    if (!sku) {
      showToast("SKU zorunludur.", "warning");
      return;
    }

    const price = Number(
      (form.elements.namedItem("price") as HTMLInputElement).value
    );

    const category = (form.elements.namedItem("category") as HTMLSelectElement)
      .value;

    const stock = Number(
      (form.elements.namedItem("stock") as HTMLInputElement).value
    );

    const barcode = (
      form.elements.namedItem("barcode") as HTMLInputElement
    ).value;

    const description = (
      form.elements.namedItem("description") as HTMLTextAreaElement
    ).value;

    const is_bestseller = (
      form.elements.namedItem("is_bestseller") as HTMLInputElement
    ).checked;

    if (newProductFiles.length === 0) {
      showToast("Lütfen en az bir ürün görseli seçin.", "warning");
      return;
    }

    setCreating(true);

    try {
      const urls: string[] = [];

      for (const file of newProductFiles) {
        const url = await uploadToStorageAndGetPublicUrl(file, "product");
        urls.push(url);
      }

      const { error } = await supabase.from("products").insert([
        {
          ["SKU"]: sku,
          name,
          price,
          category,
          stock,
          barcode: barcode?.trim() || null,
          is_bestseller,
          description,
          images: urls,
          image: urls[0] || "",
          discount_price: 0,
        },
      ]);

      if (error) throw error;

      revokeUrls(newProductPreviews);
      setNewProductFiles([]);
      setNewProductPreviews([]);
      setIsAddProductOpen(false);

      showToast("Ürün eklendi.", "success");
      loadAllData();
    } catch (err: any) {
      showToast("Ürün eklenemedi: " + (err?.message || "Bilinmeyen hata"), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessageReply = async (messageId: number) => {
    if (!replyText.trim()) {
      showToast("Lütfen bir cevap yazın.", "warning");
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("messages")
      .update({ answer: replyText, answered_at: now })
      .eq("id", messageId);

    if (error) {
      showToast("Cevap gönderilemedi: " + error.message, "error");
      return;
    }

    showToast("Cevap müşteriye iletildi.", "success");

    setDbMessages((prev: any) =>
      prev.map((m: any) =>
        m.id === messageId ? { ...m, answer: replyText, answered_at: now } : m
      )
    );

    setReplyingTo(null);
    setReplyText("");
  };

  const handleSendQuestionReply = async (questionId: number) => {
    if (!qReplyText.trim()) {
      showToast("Lütfen bir cevap yazın.", "warning");
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("questions")
      .update({
        answer: qReplyText,
        answered_at: now,
      })
      .eq("id", questionId);

    if (error) {
      showToast("Cevap gönderilemedi: " + error.message, "error");
      return;
    }

    showToast("Ürün sorusu cevaplandı.", "success");

    setDbQuestions((prev: any) =>
      prev.map((q: any) =>
        q.id === questionId
          ? { ...q, answer: qReplyText, answered_at: now }
          : q
      )
    );

    setReplyingToQ(null);
    setQReplyText("");
  };

  const handleToggleQuestionApproval = async (
    questionId: number,
    currentStatus: boolean
  ) => {
    const newStatus = !currentStatus;

    const { error } = await supabase
      .from("questions")
      .update({ is_approved: newStatus })
      .eq("id", questionId);

    if (error) {
      showToast("Durum güncellenemedi: " + error.message, "error");
      return;
    }

    setDbQuestions((prev: any) =>
      prev.map((q: any) =>
        q.id === questionId ? { ...q, is_approved: newStatus } : q
      )
    );

    showToast(newStatus ? "Soru yayına alındı." : "Soru yayından kaldırıldı.", "success");
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      showToast("Hata: " + error.message, "error");
      return;
    }

    showToast(`Sipariş durumu "${newStatus}" olarak güncellendi.`, "success");

    setDbOrders((prev: any) =>
      prev.map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const handleApproveReview = async (reviewId: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: true })
      .eq("id", reviewId);

    if (error) {
      showToast("Hata: " + error.message, "error");
      return;
    }

    showToast("Yorum yayına alındı.", "success");

    setDbReviews((prev: any) =>
      prev.map((r: any) =>
        r.id === reviewId ? { ...r, is_approved: true } : r
      )
    );
  };

  const handleDeleteReview = async (reviewId: string) => {
    const ok = await showConfirm({
      title: "Yorum silinsin mi?",
      message: "Bu yorumu tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

    if (error) {
      showToast("Hata: " + error.message, "error");
      return;
    }

    showToast("Yorum silindi.", "success");
    setDbReviews((prev: any) => prev.filter((r: any) => r.id !== reviewId));
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      showToast("Lütfen kampanya için bir isim girin.", "warning");
      return;
    }

    if (selectedCampaignProducts.length === 0) {
      showToast("Kampanyaya dahil edilecek ürünleri seçin.", "warning");
      return;
    }

    if (!campaignDates.start || !campaignDates.end) {
      showToast("Lütfen kampanya başlangıç ve bitiş tarihlerini seçin.", "warning");
      return;
    }

    if (discountPercent <= 0 || discountPercent >= 90) {
      showToast("İndirim yüzdesi 1-89 arası olmalıdır.", "warning");
      return;
    }

    const startIso = new Date(campaignDates.start).toISOString();
    const endIso = new Date(campaignDates.end + "T23:59:59").toISOString();

    const { error } = await supabase.from("campaigns").insert([
      {
        name: campaignName,
        discount_percent: discountPercent,
        start_date: startIso,
        end_date: endIso,
        product_ids: selectedCampaignProducts,
      },
    ]);

    if (error) {
      showToast("Kampanya oluşturulamadı: " + error.message, "error");
      return;
    }

    showToast("Yeni kampanya başarıyla kuruldu.", "success");

    setSelectedCampaignProducts([]);
    setCampaignDates({ start: "", end: "" });
    setCampaignName("");
    setDiscountPercent(20);

    loadAllData();
  };

  const handleDeleteCampaign = async (id: number) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);

    if (error) {
      showToast("Kampanya silinemedi: " + error.message, "error");
      return;
    }

    showToast("Kampanya silindi.", "success");
    loadAllData();
  };

  const handleSaveMarquee = () => {
    localStorage.setItem("prestigeso_campaign", marquee);
    showToast("Kayan yazı kaydedildi.", "success");
  };

  const handleAddSlide = async () => {
    if (newSlideFiles.length === 0) {
      showToast("Lütfen en az bir görsel seçin.", "warning");
      return;
    }

    try {
      const urls = await Promise.all(
        newSlideFiles.map((file) => uploadToStorageAndGetPublicUrl(file, "hero"))
      );

      const inserts = urls.map((url) => ({
        image_url: url,
        title: newSlide.title.trim(),
        subtitle: newSlide.subtitle.trim(),
      }));

      const { error } = await supabase.from("hero_slides").insert(inserts);

      if (error) throw error;

      showToast("Slide'lar eklendi.", "success");

      revokeUrls(newSlidePreviews);
      setNewSlideFiles([]);
      setNewSlidePreviews([]);
      setNewSlide({ title: "", subtitle: "" });

      loadAllData();
    } catch (err: any) {
      showToast("Slide eklenemedi: " + (err?.message || "Bilinmeyen hata"), "error");
    }
  };

  const handleDeleteSlide = async (id: number) => {
    const ok = await showConfirm({
      title: "Slide silinsin mi?",
      message: "Bu slide'ı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    const { error } = await supabase.from("hero_slides").delete().eq("id", id);

    if (error) {
      showToast("Slide silinemedi: " + error.message, "error");
      return;
    }

    showToast("Slide silindi.", "success");
    loadAllData();
  };

  const handleUpdateSlide = async (slide: Slide) => {
    const { error } = await supabase
      .from("hero_slides")
      .update({
        image_url: slide.image_url,
        title: slide.title,
        subtitle: slide.subtitle,
      })
      .eq("id", slide.id);

    if (error) {
      showToast("Slide güncellenemedi: " + error.message, "error");
      return;
    }

    showToast("Slide kaydedildi.", "success");
    loadAllData();
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black pb-32">
      <HeaderBar
        unreadMessagesCount={unreadMessagesCount}
        onOpenMessages={() => setIsMessagesOpen(true)}
        totalNotifications={totalNotifications}
        isNotificationsOpen={isNotificationsOpen}
        setIsNotificationsOpen={setIsNotificationsOpen}
        notifications={unifiedNotifications}
        avatarLetter="A"
      />

      <AdminNav
        activeNavMenu={activeNavMenu}
        setActiveNavMenu={setActiveNavMenu}
        unansweredQuestionsCount={unansweredQuestionsCount}
        pendingReviewsCount={pendingReviewsCount}
        pendingOrdersCount={pendingOrdersCount}
        unreadMessagesCount={unreadMessagesCount}
        onOpenQuestions={() => setIsQuestionsOpen(true)}
        onOpenReviews={() => setIsReviewsOpen(true)}
        onOpenMessages={() => setIsMessagesOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenPerformanceFavorites={() => {
          setPerfTab("favorites");
          setIsPerformanceOpen(true);
        }}
        onOpenPerformanceReviews={() => {
          setPerfTab("reviews");
          setIsPerformanceOpen(true);
        }}
        onOpenPerformanceViews={() => {
          setPerfTab("views");
          setIsPerformanceOpen(true);
        }}
        onOpenAnalysisRevenue={() => {
          setAnalysisTab("revenue");
          setIsAnalysisOpen(true);
        }}
        onOpenAnalysisOrders={() => {
          setAnalysisTab("orders");
          setIsAnalysisOpen(true);
        }}
        onOpenAnalysisVisits={() => {
          setAnalysisTab("visits");
          setIsAnalysisOpen(true);
        }}
      />

      <div className="px-6 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-green-200 hover:shadow-md transition-all">
            <span className="text-3xl mb-2">💸</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {activeMonth} CİROSU
            </p>
            <p className="text-3xl font-black text-green-600">
              {monthlyRevenue.toLocaleString("tr-TR")} ₺
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-black hover:shadow-md transition-all">
            <span className="text-3xl mb-2">📦</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {activeMonth} SİPARİŞİ
            </p>
            <p className="text-3xl font-black text-black">{monthlyOrders}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-blue-200 hover:shadow-md transition-all">
            <span className="text-3xl mb-2">👁️</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {activeMonth} ZİYARETİ
            </p>
            <p className="text-3xl font-black text-blue-600">
              {monthlyVisits}
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:border-black hover:shadow-md transition-all">
            <span className="text-3xl mb-2">🛍️</span>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              TOPLAM ÜRÜN
            </p>
            <p className="text-3xl font-black text-black">
              {dbProducts.length}
            </p>
          </div>
        </div>

        <ProductList
          loading={loading}
          dbProducts={dbProducts as any}
          dbCampaigns={dbCampaigns as any}
          stockTab={stockTab}
          setStockTab={setStockTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onEditProduct={openEditProduct}
          onRefresh={loadAllData}
        />
      </div>

      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="bg-white text-black border border-gray-200 shadow-xl px-5 py-3.5 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"
        >
          <span>⚙️</span> Özel Panel
        </button>
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${
            isFabOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-50 translate-y-10 pointer-events-none"
          }`}
        >
          <button
            onClick={() => {
              setIsFabOpen(false);
              setIsAddProductOpen(true);
            }}
            className="bg-white text-black border border-gray-200 shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-gray-50 w-max"
          >
            <span>📦</span> Yeni Ürün Ekle
          </button>

          <button
            onClick={() => {
              setIsFabOpen(false);
              setIsCampaignOpen(true);
            }}
            className="bg-blue-600 text-white shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-blue-700 w-max"
          >
            <span>🏷️</span> Kampanya / İndirim
          </button>
        </div>

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-all duration-300 z-50 ${
            isFabOpen
              ? "bg-red-500 text-white rotate-45"
              : "bg-black text-white rotate-0 hover:scale-105"
          }`}
        >
          +
        </button>
      </div>

      <AddProductModal
        open={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSubmit={handleAddProduct}
        creating={creating}
        files={newProductFiles}
        setFiles={setNewProductFiles}
        previews={newProductPreviews}
        setPreviews={setNewProductPreviews}
        moveImage={moveNewImage}
      />

      <EditProductModal
        open={editLoading || !!editingProduct}
        onClose={() => setEditingProduct(null)}
        loading={editLoading}
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        onSubmit={handleUpdateProduct}
        saving={saving}
        onDelete={handleDeleteProduct}
        moveImage={moveEditImage}
        removeImage={removeImageFromGallery}
        addFiles={editAddFiles}
        setAddFiles={setEditAddFiles}
        addPreviews={editAddPreviews}
        setAddPreviews={setEditAddPreviews}
        addUploading={editAddUploading}
        onAddMoreImages={handleAddMoreImagesToProduct}
      />

      <CampaignModal
        open={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        campaignName={campaignName}
        setCampaignName={setCampaignName}
        discountPercent={discountPercent}
        setDiscountPercent={setDiscountPercent}
        campaignDates={campaignDates}
        setCampaignDates={setCampaignDates}
        selectedCampaignProducts={selectedCampaignProducts}
        setSelectedCampaignProducts={setSelectedCampaignProducts}
        dbProducts={dbProducts as any}
        dbCampaigns={dbCampaigns as any}
        onCreateCampaign={handleCreateCampaign}
        onDeleteCampaign={handleDeleteCampaign}
      />

      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        marquee={marquee}
        setMarquee={setMarquee}
        onSaveMarquee={handleSaveMarquee}
        dbSlides={dbSlides as any}
        setDbSlides={(updater) => setDbSlides(updater)}
        newSlideFiles={newSlideFiles}
        setNewSlideFiles={setNewSlideFiles}
        newSlidePreviews={newSlidePreviews}
        setNewSlidePreviews={setNewSlidePreviews}
        newSlide={newSlide}
        setNewSlide={setNewSlide}
        onAddSlide={handleAddSlide}
        onUpdateSlide={handleUpdateSlide}
        onDeleteSlide={handleDeleteSlide}
      />

      <MessagesModal
        open={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        messages={dbMessages as any}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        replyText={replyText}
        setReplyText={setReplyText}
        onSendReply={handleSendMessageReply}
      />

      <QuestionsModal
        open={isQuestionsOpen}
        onClose={() => setIsQuestionsOpen(false)}
        questions={dbQuestions as any}
        replyingToQ={replyingToQ}
        setReplyingToQ={setReplyingToQ}
        qReplyText={qReplyText}
        setQReplyText={setQReplyText}
        onSendReply={handleSendQuestionReply}
        onToggleApproval={handleToggleQuestionApproval}
      />

      <OrdersModal
        open={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        orders={dbOrders as any}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      <ReviewsModal
        open={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
        reviews={dbReviews as any}
        onApprove={handleApproveReview}
        onDelete={handleDeleteReview}
      />

      <PerformanceModal
        open={isPerformanceOpen}
        onClose={() => setIsPerformanceOpen(false)}
        tab={perfTab}
        setTab={setPerfTab}
        favoritesRank={favoritesRank as any}
        reviewsRank={reviewsRank as any}
        viewsRank={viewsRank as any}
      />

      <AnalysisModal
        open={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        tab={analysisTab}
        setTab={setAnalysisTab}
        allTimeRevenue={allTimeRevenue}
        allTimeOrders={allTimeOrders}
        allTimeVisits={allTimeVisits}
      />
    </div>
  );
}
