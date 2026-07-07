
"use client";

import { useState } from "react";
import { useAppAlert } from "@/context/AppAlertContext";

import { useAdminData } from "./hooks/useAdminData";
import { useAdminNotifications } from "./hooks/useAdminNotifications";
import { useProductActions } from "./hooks/useProductActions";
import { useCampaignActions } from "./hooks/useCampaignActions";
import { useSettingsActions } from "./hooks/useSettingsActions";
import { useMessagingActions } from "./hooks/useMessagingActions";
import { useOrderActions } from "./hooks/useOrderActions";
import { useReviewActions } from "./hooks/useReviewActions";
import { usePerformanceData } from "./hooks/usePerformanceData";

import { HeaderBar, AdminNav, ProductList } from "./parts";
import AdminDashboardSummary from "./parts/AdminDashboardSummary";
import AdminFloatingActions from "./parts/AdminFloatingActions";
import AdminDashboardAlerts from "./parts/AdminDashboardAlerts";
import {
  AddProductModal,
  EditProductModal,
  CampaignModal,
  CouponsModal,
  SettingsModal,
  MessagesModal,
  QuestionsModal,
  OrdersModal,
  ReviewsModal,
  PerformanceModal,
  CategoriesModal,
} from "./modals";

export default function AdminPanel() {
  const { showToast, showConfirm } = useAppAlert();

  const activeMonth = new Date()
    .toLocaleString("tr-TR", { month: "long" })
    .toUpperCase();

  // ── Data ─────────────────────────────────────────────────────
  const {
    loading,
    dbProducts,
    dbSlides,
    dbCampaigns,
    dbCategories,
    dbMessages,
    dbQuestions,
    dbOrders,
    dbReviews,
    dbAllFavorites,
    dbProductViews,
    monthlyRevenue,
    monthlyOrders,
    monthlyVisits,
    loadAllData,
    setDbSlides,
    setDbMessages,
    setDbQuestions,
    setDbOrders,
    setDbReviews,
  } = useAdminData();

  // ── UI state (modal open/close) ──────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [stockTab, setStockTab] = useState<"all" | "in" | "out">("all");
  const [activeNavMenu, setActiveNavMenu] = useState<string | null>(null);

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [perfTab, setPerfTab] = useState<"favorites" | "views" | "reviews">("favorites");

  // ── Domain hooks ─────────────────────────────────────────────
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

  const productActions = useProductActions({ dbProducts, loadAllData, showToast, showConfirm });
  const campaignActions = useCampaignActions({ loadAllData, showToast });
  const settingsActions = useSettingsActions({ loadAllData, showToast, showConfirm });
  const messagingActions = useMessagingActions({ setDbMessages, setDbQuestions, showToast });
  const orderActions = useOrderActions({ setDbOrders, showToast });
  const reviewActions = useReviewActions({ setDbReviews, showToast, showConfirm });
  const performanceData = usePerformanceData({ dbProducts, dbReviews, dbAllFavorites, dbProductViews });

  // ── handleAddProduct wrapper (closes modal on success) ──────
  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    const success = await productActions.handleAddProduct(e);
    if (success) setIsAddProductOpen(false);
  };

  // ── Render ───────────────────────────────────────────────────
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
      />

      <div className="px-6 max-w-6xl mx-auto space-y-6">
        <AdminDashboardSummary
          activeMonth={activeMonth}
          monthlyRevenue={monthlyRevenue}
          monthlyOrders={monthlyOrders}
          monthlyVisits={monthlyVisits}
          totalProducts={dbProducts.length}
        />

        <AdminDashboardAlerts
          pendingOrdersCount={pendingOrdersCount}
          unansweredQuestionsCount={unansweredQuestionsCount}
          pendingReviewsCount={pendingReviewsCount}
          unreadMessagesCount={unreadMessagesCount}
          onOpenOrders={() => setIsOrdersOpen(true)}
          onOpenQuestions={() => setIsQuestionsOpen(true)}
          onOpenReviews={() => setIsReviewsOpen(true)}
          onOpenMessages={() => setIsMessagesOpen(true)}
        />

        <ProductList
          loading={loading}
          dbProducts={dbProducts as any}
          dbCampaigns={dbCampaigns as any}
          dbCategories={dbCategories as any}
          stockTab={stockTab}
          setStockTab={setStockTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onEditProduct={productActions.openEditProduct}
          onRefresh={loadAllData}
          onInlineUpdate={productActions.handleInlineUpdate}
        />
      </div>

      <AdminFloatingActions
        isFabOpen={isFabOpen}
        setIsFabOpen={setIsFabOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddProduct={() => setIsAddProductOpen(true)}
        onOpenCampaign={() => setIsCampaignOpen(true)}
        onOpenCoupons={() => setIsCouponsOpen(true)}
        onOpenCategories={() => setIsCategoriesOpen(true)}
      />

      <AddProductModal open={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} onSubmit={handleAddProduct} creating={productActions.creating} files={productActions.newProductFiles} setFiles={productActions.setNewProductFiles} previews={productActions.newProductPreviews} setPreviews={productActions.setNewProductPreviews} moveImage={productActions.moveNewImage} categories={dbCategories} />
      <EditProductModal open={productActions.editLoading || !!productActions.editingProduct} onClose={() => productActions.setEditingProduct(null)} loading={productActions.editLoading} editingProduct={productActions.editingProduct} setEditingProduct={productActions.setEditingProduct} onSubmit={productActions.handleUpdateProduct} saving={productActions.saving} onDelete={productActions.handleDeleteProduct} moveImage={productActions.moveEditImage} removeImage={productActions.removeImageFromGallery} addFiles={productActions.editAddFiles} setAddFiles={productActions.setEditAddFiles} addPreviews={productActions.editAddPreviews} setAddPreviews={productActions.setEditAddPreviews} addUploading={productActions.editAddUploading} onAddMoreImages={productActions.handleAddMoreImagesToProduct} categories={dbCategories} />
      <CampaignModal open={isCampaignOpen} onClose={() => setIsCampaignOpen(false)} campaignName={campaignActions.campaignName} setCampaignName={campaignActions.setCampaignName} discountPercent={campaignActions.discountPercent} setDiscountPercent={campaignActions.setDiscountPercent} campaignDates={campaignActions.campaignDates} setCampaignDates={campaignActions.setCampaignDates} selectedCampaignProducts={campaignActions.selectedCampaignProducts} setSelectedCampaignProducts={campaignActions.setSelectedCampaignProducts} dbProducts={dbProducts as any} dbCampaigns={dbCampaigns as any} onCreateCampaign={campaignActions.handleCreateCampaign} onDeleteCampaign={campaignActions.handleDeleteCampaign} />
      <CouponsModal open={isCouponsOpen} onClose={() => setIsCouponsOpen(false)} />
      <CategoriesModal isOpen={isCategoriesOpen} onClose={() => setIsCategoriesOpen(false)} categories={dbCategories} onRefresh={loadAllData} showToast={showToast} showConfirm={showConfirm} />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} marquee={settingsActions.marquee} setMarquee={settingsActions.setMarquee} onSaveMarquee={settingsActions.handleSaveMarquee} dbSlides={dbSlides as any} setDbSlides={(updater) => setDbSlides(updater)} newSlideFiles={settingsActions.newSlideFiles} setNewSlideFiles={settingsActions.setNewSlideFiles} newSlidePreviews={settingsActions.newSlidePreviews} setNewSlidePreviews={settingsActions.setNewSlidePreviews} newSlide={settingsActions.newSlide} setNewSlide={settingsActions.setNewSlide} onAddSlide={settingsActions.handleAddSlide} onUpdateSlide={settingsActions.handleUpdateSlide} onDeleteSlide={settingsActions.handleDeleteSlide} />
      <MessagesModal open={isMessagesOpen} onClose={() => setIsMessagesOpen(false)} messages={dbMessages as any} replyingTo={messagingActions.replyingTo} setReplyingTo={messagingActions.setReplyingTo} replyText={messagingActions.replyText} setReplyText={messagingActions.setReplyText} onSendReply={messagingActions.handleSendMessageReply} />
      <QuestionsModal open={isQuestionsOpen} onClose={() => setIsQuestionsOpen(false)} questions={dbQuestions as any} replyingToQ={messagingActions.replyingToQ} setReplyingToQ={messagingActions.setReplyingToQ} qReplyText={messagingActions.qReplyText} setQReplyText={messagingActions.setQReplyText} onSendReply={messagingActions.handleSendQuestionReply} onToggleApproval={messagingActions.handleToggleQuestionApproval} />
      <OrdersModal open={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} orders={dbOrders as any} onUpdateStatus={orderActions.handleUpdateOrderStatus} />
      <ReviewsModal open={isReviewsOpen} onClose={() => setIsReviewsOpen(false)} reviews={dbReviews as any} onApprove={reviewActions.handleApproveReview} onDelete={reviewActions.handleDeleteReview} />
      <PerformanceModal open={isPerformanceOpen} onClose={() => setIsPerformanceOpen(false)} tab={perfTab} setTab={setPerfTab} favoritesRank={performanceData.favoritesRank as any} reviewsRank={performanceData.reviewsRank as any} viewsRank={performanceData.viewsRank as any} />
    </div>
  );
}
