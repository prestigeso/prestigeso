"use client";

import { useEffect, useState } from "react";
import { useAppAlert } from "@/context/AppAlertContext";

import { useAdminData } from "./hooks/useAdminData";
import { useTrendyolEntrySync } from "./hooks/useTrendyolEntrySync";
import { useProductActions } from "./hooks/useProductActions";
import { useCampaignActions } from "./hooks/useCampaignActions";
import { useSettingsActions } from "./hooks/useSettingsActions";
import { useMessagingActions } from "./hooks/useMessagingActions";
import { useOrderActions } from "./hooks/useOrderActions";
import { useReviewActions } from "./hooks/useReviewActions";
import { usePerformanceData } from "./hooks/usePerformanceData";

import AdminStudioShell, {
  isAdminSection,
  type AdminSection,
} from "./AdminStudioShell";
import StudioOverview from "./StudioOverview";
import StudioProducts from "./StudioProducts";
import StudioOrders from "./StudioOrders";
import StudioCustomers from "./StudioCustomers";
import StudioPane from "./StudioPane";
import StudioInsights from "./StudioInsights";
import AnalyticsDashboard from "./AnalyticsDashboard";
import Phase2Records from "./Phase2Records";
import SearchConsoleReport from "./SearchConsoleReport";
import SearchInspection from "./SearchInspection";
import SearchConnection from "./SearchConnection";
import MarketingPreparationStatus from "./MarketingPreparationStatus";
import OrderContribution from "./OrderContribution";
import PriceScenario from "./PriceScenario";
import ProfitAnalysis from "./ProfitAnalysis";
import ProfitSettings from "./ProfitSettings";
import TrendyolSync from "./TrendyolSync";
import s from "./AdminStudio.module.css";
import type { OrderRow } from "./types";
import AdminOperationsQueue from "./parts/AdminOperationsQueue";
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
  const trendyolSync = useTrendyolEntrySync();
  const { showToast, showConfirm } = useAppAlert();

  const [section, setSection] = useState<AdminSection>("overview");
  const [customerTab, setCustomerTab] = useState("messages");
  const [customerChannel,setCustomerChannel]=useState('all');
  const [marketingTab, setMarketingTab] = useState("google");
  const [financeTab, setFinanceTab] = useState("orders");
  const [financeView, setFinanceView] = useState("sales");
  const [settingsTab, setSettingsTab] = useState("shipping");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [showOperations, setShowOperations] = useState(false);
  const [orderRevision, setOrderRevision] = useState(0);
  const navigate = (next: AdminSection) => {
    setSection(next);
    setShowOperations(false);
    window.history.pushState(null, "", `/admin?view=${next}`);
  };
  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.search).get("view");
      setSection(isAdminSection(value) ? value : "overview");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  // ── Data ─────────────────────────────────────────────────────
  const {
    loading,
    error: dashboardError,
    dbProducts,
    dbSlides,
    dbCampaigns,
    dbCategories,
    dbMessages,
    dbQuestions,
    dbOrders,
    dbReviews,
    productMetrics,
    monthlyRevenue,
    monthlyOrders,
    monthlyVisits,
    loadAllData,
    setDbSlides,
    setDbMessages,
    setDbQuestions,
    setDbOrders,
    setDbReviews,
    listMeta,
    loadAdminList,
    dashboardCounts,
  } = useAdminData();

  // ── UI state (modal open/close) ──────────────────────────────

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
  const [perfTab, setPerfTab] = useState<"favorites" | "views" | "reviews">(
    "favorites",
  );

  // ── Domain hooks ─────────────────────────────────────────────

  const productActions = useProductActions({
    dbProducts,
    loadAllData,
    showToast,
    showConfirm,
  });
  const campaignActions = useCampaignActions({ loadAllData, showToast });
  const settingsActions = useSettingsActions({
    loadAllData,
    showToast,
    showConfirm,
  });
  const messagingActions = useMessagingActions({
    setDbMessages,
    setDbQuestions,
    showToast,
  });
  const orderActions = useOrderActions({
    setDbOrders,
    showToast,
    refreshOrders: async () => {
      if (!selectedOrder) {
        await loadAdminList("orders", listMeta.orders.page);
        return;
      }
      const response = await fetch(
        `/api/admin/lists?resource=orders&id=${selectedOrder.id}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error("Sipariş yenilenemedi.");
      setDbOrders((previous) => [
        ...previous.filter((o) => o.id !== selectedOrder.id),
        ...result.items,
      ]);
    },
  });
  const reviewActions = useReviewActions({
    setDbReviews,
    showToast,
    showConfirm,
  });
  const performanceData = usePerformanceData({ dbProducts, productMetrics });

  useEffect(() => {
    if (
      isMessagesOpen ||
      (section === "customers" && customerTab === "messages")
    )
      void loadAdminList("messages", 1);
  }, [isMessagesOpen, section, customerTab, loadAdminList]);

  useEffect(() => {
    if (
      isQuestionsOpen ||
      (section === "customers" && customerTab === "questions")
    )
      void loadAdminList("questions", 1);
  }, [isQuestionsOpen, section, customerTab, loadAdminList]);

  useEffect(() => {
    if (isOrdersOpen && !selectedOrder) void loadAdminList("orders", 1);
  }, [isOrdersOpen, selectedOrder, loadAdminList]);

  // ── handleAddProduct wrapper (closes modal on success) ──────
  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    const success = await productActions.handleAddProduct(e);
    if (success) setIsAddProductOpen(false);
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <AdminStudioShell section={section} onNavigate={navigate}>
      {section === "overview" && (
        <StudioOverview
          revision={trendyolSync.revision}
          loading={loading}
          error={dashboardError}
          revenue={monthlyRevenue}
          orders={monthlyOrders}
          visits={monthlyVisits}
          issues={dashboardCounts.actionablePayments ?? null}
          onIssues={() => setShowOperations(!showOperations)}
          recentOrders={dbOrders}
          onOrders={() => navigate("orders")}
          onOrder={(order) => {
            setSelectedOrder(order);
            setIsOrdersOpen(true);
          }}
        />
      )}
      {showOperations && (
        <AdminOperationsQueue
          onOpenOrders={() => {
            setSelectedOrder(null);
            setIsOrdersOpen(true);
          }}
        />
      )}
      {section === "products" && (
        <>
          <header className={s.heading}>
            <div>
              <h1>Ürünler</h1>
              <p>Kataloğunuzu, fiyatları ve stokları yönetin.</p>
            </div>
            <div className={s.row}>
              <button
                className={s.button}
                onClick={() => setIsCategoriesOpen(true)}
              >
                Kategoriler
              </button>
              <button
                className={s.primary}
                onClick={() => setIsAddProductOpen(true)}
              >
                Ürün ekle
              </button>
            </div>
          </header>
          <StudioProducts
            dbProducts={dbProducts}
            categories={dbCategories}
            onEdit={productActions.openEditProduct}
            onSave={productActions.handleInlineUpdate}
          />
        </>
      )}
      {section === "orders" && (
        <>
          <header className={s.heading}>
            <div>
              <h1>Siparişler</h1>
              <p>
                Tüm siparişleri tek listede görün, satış kanalına göre
                filtreleyin.
              </p>
            </div>
          </header>
          <StudioOrders
            products={dbProducts}
            revision={orderRevision + trendyolSync.revision}
            syncMessage={trendyolSync.message}
            syncBusy={trendyolSync.busy}
            onSync={trendyolSync.refresh}
            onOpen={(order) => {
              setSelectedOrder(order);
              setDbOrders((previous) => [
                order,
                ...previous.filter((o) => o.id !== order.id),
              ]);
              setIsOrdersOpen(true);
            }}
          />
        </>
      )}
      {section === "customers" && (
        <StudioCustomers onChannelChange={setCustomerChannel}>
          <div className={s.tabs}>
            {[
              ["messages", "Mesajlar"],
              ["questions", "Ürün soruları / sorunları"],
              ["reviews", "Yorumlar"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={customerTab === key}
                onClick={() => setCustomerTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </StudioCustomers>
      )}
      {section === "performance" && (
        <>
          <header className={s.heading}>
            <div>
              <h1>Mağaza performansı</h1>
            </div>
            <button
              className={s.button}
              onClick={() => setIsPerformanceOpen(true)}
            >
              Ürün beğeni ve favorileri
            </button>
          </header>
          <StudioInsights mode="performance" />
          <details className={s.panel}>
            <summary>Detaylı performans raporları</summary>
            <div className={s.embeddedReport}>
              <AnalyticsDashboard embedded />
            </div>
          </details>
        </>
      )}
      <StudioPane active={section === "marketing"}>
        <>
          <header className={s.heading}>
            <div>
              <h1>Pazarlama</h1>
            </div>
          </header>
          <StudioInsights mode="marketing" active={section === "marketing"} />
          <details className={s.panel}>
            <summary>Google aramaları ve kampanya araçları</summary>
            <div className={s.tabs}>
              {[
                ["ads", "Reklamlar", "Ölçüm ve bağlantı durumu"],
                [
                  "google",
                  "Google aramaları",
                  "Sorgular, gösterimler ve tıklamalar",
                ],
                ["campaigns", "Kampanyalar", "İndirim dönemleri ve kuponlar"],
              ].map(([key, label, description]) => (
                <button
                  key={key}
                  aria-label={label}
                  aria-pressed={marketingTab === key}
                  onClick={() => setMarketingTab(key)}
                >
                  {label}
                  <small>{description}</small>
                </button>
              ))}
            </div>
            <div hidden={marketingTab !== "ads"}>
              <details>
                <summary>Reklam ölçümü teknik hazırlığı</summary>
                <MarketingPreparationStatus />
              </details>
            </div>
            <div hidden={marketingTab !== "google"}>
              <SearchConsoleReport active={section==='marketing' && marketingTab==='google'} />
              <details className={s.panel}>
                <summary>URL denetimi</summary>
                <SearchInspection />
              </details>
            </div>
            <div hidden={marketingTab !== "campaigns"} className={s.panel}>
              <h2>Kampanya ve kuponlar</h2>
              <p>İndirim dönemlerini ve kullanılabilir kuponları yönetin.</p>
              <div className={s.row}>
                <button
                  className={s.primary}
                  onClick={() => setIsCampaignOpen(true)}
                >
                  Kampanyaları yönet
                </button>
                <button
                  className={s.button}
                  onClick={() => setIsCouponsOpen(true)}
                >
                  Kuponları yönet
                </button>
              </div>
            </div>
          </details>
        </>
      </StudioPane>
      <StudioPane active={section === "finance"}>
        <>
          <header className={s.heading}>
            <div>
              <h1>Finans</h1>
              <p>Gerçekleşen giderleri ve tahminleri ayrı görün.</p>
            </div>
          </header>
          <div className={s.tabs} aria-label="Finans görünümü">
            <button aria-pressed={financeView === "sales"} onClick={() => setFinanceView("sales")}>Satış özeti</button>
            <button aria-pressed={financeView === "profit"} onClick={() => setFinanceView("profit")}>Kâr analizi</button>
          </div>
          <div hidden={financeView !== "sales"}><StudioInsights mode="finance" active={section === "finance" && financeView === "sales"} /></div>
          <div hidden={financeView !== "profit"}><ProfitAnalysis active={section === "finance" && financeView === "profit"} syncRevision={trendyolSync.revision} onOpenSettings={()=>{navigate("settings");setSettingsTab("profit");}} /></div>
          <details className={s.panel}>
            <summary>Sipariş katkısı ve fiyat araçları</summary>
            <div className={s.tabs}>
              {[
                [
                  "orders",
                  "Sipariş katkısı",
                  "Gerçekleşen satış ve kayıtlı giderler",
                ],
                [
                  "scenario",
                  "Fiyat senaryosu",
                  "Satış yapmadan maliyeti karşılaştırın",
                ],
              ].map(([key, label, description]) => (
                <button
                  key={key}
                  aria-label={label}
                  aria-pressed={financeTab === key}
                  onClick={() => setFinanceTab(key)}
                >
                  {label}
                  <small>{description}</small>
                </button>
              ))}
            </div>
            <div hidden={financeTab !== "orders"}>
              <OrderContribution />
            </div>
            <div hidden={financeTab !== "scenario"}>
              <PriceScenario />
            </div>
            <p className={s.notice}>
              Eksik maliyet, vergi veya reklam verisi sıfır kabul edilmez. Bu
              ekran muhasebesel net kâr beyanı değildir.
            </p>
            <button
              className={s.button}
              onClick={() => {
                navigate("settings");
                setSettingsTab("costs");
              }}
            >
              Maliyet ayarlarına git
            </button>
          </details>
        </>
      </StudioPane>
      <StudioPane active={section === "settings"}>
        <>
          <header className={s.heading}>
            <div>
              <h1>Ayarlar</h1>
              <p>Mağaza, maliyetler ve bağlantı ayarları.</p>
            </div>
          </header>
          <div className={s.tabs}>
            {[
              [
                "shipping",
                "Kargo ve vitrin",
                "Teslimat kuralları ve ana sayfa",
              ],
              ["costs", "Maliyet kayıtları", "Ürün maliyetleri ve giderler"],
              ["profit", "Kâr ayarları", "Kanala ve tarihe göre gider kuralları"],
              [
                "integrations",
                "Bağlantılar",
                "Google ve Trendyol bağlantıları",
              ],
              ["security", "Güvenlik", "Oturum ve erişim bilgileri"],
            ].map(([key, label, description]) => (
              <button
                key={key}
                aria-label={label}
                aria-pressed={settingsTab === key}
                onClick={() => setSettingsTab(key)}
              >
                {label}
                <small>{description}</small>
              </button>
            ))}
          </div>
          <div hidden={settingsTab !== "costs"}>
            <Phase2Records />
          </div>
          <div hidden={settingsTab !== "profit"}>
            <ProfitSettings active={section === "settings" && settingsTab === "profit"} />
          </div>
          <div hidden={settingsTab !== "integrations"}>
            <SearchConnection />
            <TrendyolSync />
          </div>
          {settingsTab === "security" && (
            <section className={s.panel}>
              <h2>Güvenli yönetim</h2>
              <p>
                Admin oturumu ve Authenticator doğrulaması mevcut güvenlik
                akışıyla korunur. Anahtarlar ve parola bu ekranda gösterilmez.
              </p>
              <p>
                Güvenlik değişkenleri yalnızca sunucu ortamında yönetilir.
                Bağlantı anahtarlarını sohbete veya ürün alanlarına yazmayın.
              </p>
            </section>
          )}
        </>
      </StudioPane>

      <AddProductModal
        open={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSubmit={handleAddProduct}
        creating={productActions.creating}
        files={productActions.newProductFiles}
        setFiles={productActions.setNewProductFiles}
        previews={productActions.newProductPreviews}
        setPreviews={productActions.setNewProductPreviews}
        moveImage={productActions.moveNewImage}
        categories={dbCategories}
      />
      <EditProductModal
        open={productActions.editLoading || !!productActions.editingProduct}
        onClose={() => productActions.setEditingProduct(null)}
        loading={productActions.editLoading}
        editingProduct={productActions.editingProduct}
        setEditingProduct={productActions.setEditingProduct}
        onSubmit={productActions.handleUpdateProduct}
        saving={productActions.saving}
        onDelete={productActions.handleDeleteProduct}
        moveImage={productActions.moveEditImage}
        removeImage={productActions.removeImageFromGallery}
        addFiles={productActions.editAddFiles}
        setAddFiles={productActions.setEditAddFiles}
        addPreviews={productActions.editAddPreviews}
        setAddPreviews={productActions.setEditAddPreviews}
        addUploading={productActions.editAddUploading}
        onAddMoreImages={productActions.handleAddMoreImagesToProduct}
        categories={dbCategories}
      />
      <CampaignModal
        open={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        campaignName={campaignActions.campaignName}
        setCampaignName={campaignActions.setCampaignName}
        discountPercent={campaignActions.discountPercent}
        setDiscountPercent={campaignActions.setDiscountPercent}
        campaignDates={campaignActions.campaignDates}
        setCampaignDates={campaignActions.setCampaignDates}
        selectedCampaignProducts={campaignActions.selectedCampaignProducts}
        setSelectedCampaignProducts={
          campaignActions.setSelectedCampaignProducts
        }
        dbProducts={dbProducts}
        dbCampaigns={dbCampaigns}
        onCreateCampaign={campaignActions.handleCreateCampaign}
        onDeleteCampaign={campaignActions.handleDeleteCampaign}
      />
      <CouponsModal
        open={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
      />
      <CategoriesModal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        categories={dbCategories}
        onRefresh={loadAllData}
        showToast={showToast}
        showConfirm={showConfirm}
      />
      <div className={section === "settings" ? s.inlineModal : undefined}>
        <SettingsModal
          open={
            isSettingsOpen ||
            (section === "settings" && settingsTab === "shipping")
          }
          onClose={() => setIsSettingsOpen(false)}
          marquee={settingsActions.marquee}
          setMarquee={settingsActions.setMarquee}
          onSaveMarquee={settingsActions.handleSaveMarquee}
          dbSlides={dbSlides}
          setDbSlides={(updater) => setDbSlides(updater)}
          setNewSlideFiles={settingsActions.setNewSlideFiles}
          newSlidePreviews={settingsActions.newSlidePreviews}
          setNewSlidePreviews={settingsActions.setNewSlidePreviews}
          newSlide={settingsActions.newSlide}
          setNewSlide={settingsActions.setNewSlide}
          onAddSlide={settingsActions.handleAddSlide}
          onUpdateSlide={settingsActions.handleUpdateSlide}
          onDeleteSlide={settingsActions.handleDeleteSlide}
          dbCategories={dbCategories}
        />
      </div>
      <div className={section === "customers" ? s.inlineModal : undefined}>
        <MessagesModal
          open={
            isMessagesOpen ||
            (section === "customers" && customerChannel!=='trendyol' && customerTab === "messages")
          }
          onClose={() => setIsMessagesOpen(false)}
          messages={dbMessages}
          replyingTo={messagingActions.replyingTo}
          setReplyingTo={messagingActions.setReplyingTo}
          replyText={messagingActions.replyText}
          setReplyText={messagingActions.setReplyText}
          onSendReply={messagingActions.handleSendMessageReply}
          page={listMeta.messages.page}
          total={listMeta.messages.total}
          loading={listMeta.messages.loading}
          pageSize={listMeta.messages.limit}
          onPageChange={(page) => loadAdminList("messages", page)}
        />
        <QuestionsModal
          open={
            isQuestionsOpen ||
            (section === "customers" && customerChannel!=='trendyol' && customerTab === "questions")
          }
          onClose={() => setIsQuestionsOpen(false)}
          questions={dbQuestions}
          replyingToQ={messagingActions.replyingToQ}
          setReplyingToQ={messagingActions.setReplyingToQ}
          qReplyText={messagingActions.qReplyText}
          setQReplyText={messagingActions.setQReplyText}
          onSendReply={messagingActions.handleSendQuestionReply}
          onToggleApproval={messagingActions.handleToggleQuestionApproval}
          page={listMeta.questions.page}
          total={listMeta.questions.total}
          loading={listMeta.questions.loading}
          pageSize={listMeta.questions.limit}
          onPageChange={(page) => loadAdminList("questions", page)}
        />
        <ReviewsModal
          open={
            isReviewsOpen ||
            (section === "customers" && customerChannel!=='trendyol' && customerTab === "reviews")
          }
          onClose={() => setIsReviewsOpen(false)}
          reviews={dbReviews}
          onApprove={reviewActions.handleApproveReview}
          onDelete={reviewActions.handleDeleteReview}
        />
      </div>
      <OrdersModal
        open={isOrdersOpen}
        onClose={() => {
          setIsOrdersOpen(false);
          setSelectedOrder(null);
          setOrderRevision((value) => value + 1);
        }}
        orders={
          selectedOrder
            ? dbOrders.filter((order) => order.id === selectedOrder.id)
            : dbOrders
        }
        onUpdateStatus={orderActions.handleUpdateOrderStatus}
        onReturnDecision={orderActions.handleReturnDecision}
        onShippingSaved={(orderId, carrier, trackingNumber) =>
          setDbOrders((orders) =>
            orders.map((order) =>
              order.id === orderId
                ? {
                    ...order,
                    shipping_carrier: carrier,
                    tracking_number: trackingNumber,
                    status: "Kargolandı",
                  }
                : order,
            ),
          )
        }
        page={selectedOrder ? 1 : listMeta.orders.page}
        total={selectedOrder ? 1 : listMeta.orders.total}
        loading={listMeta.orders.loading}
        pageSize={listMeta.orders.limit}
        onPageChange={(page) => loadAdminList("orders", page)}
      />
      <PerformanceModal
        open={isPerformanceOpen}
        onClose={() => setIsPerformanceOpen(false)}
        tab={perfTab}
        setTab={setPerfTab}
        favoritesRank={performanceData.favoritesRank}
        reviewsRank={performanceData.reviewsRank}
        viewsRank={performanceData.viewsRank}
      />
    </AdminStudioShell>
  );
}
