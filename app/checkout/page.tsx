"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import NoticeToast from "@/components/checkout/NoticeToast";
import CheckoutAddressModal from "@/components/checkout/CheckoutAddressModal";
import CheckoutContractModal from "@/components/checkout/CheckoutContractModal";
import CheckoutSummary from "@/components/checkout/CheckoutSummary";
import {
  MAX_ADDRESS_TITLE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_FULL_ADDRESS_LENGTH,
  MAX_NAME_LENGTH,
  type AddressForm,
  type AddressRow,
  type CheckoutMode,
  type CouponRow,
  type CouponUsageRow,
  type LocationOption,
  type NoticeType,
  type ProvinceOption,
} from "@/lib/checkout/checkoutTypes";
import {
  formatMoney,
  isValidEmail,
  normalizeCouponCode,
  normalizeEmail,
} from "@/lib/checkout/checkoutFormatters";
import {
  getErrorMessage,
  normalizeText,
  normalizePhone,
  isValidTurkishPhone,
} from "@/lib/utils";
import { validateAddressForm } from "@/lib/checkout/checkoutValidators";
import {
  calculateRemainingForFreeShipping,
  calculateShippingFee,
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
} from "@/lib/checkout/checkoutShipping";
import {
  calculateCouponDiscount,
  getCouponLabel,
} from "@/lib/checkout/checkoutCoupons";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from "@/lib/browserStorage";
import { DISTANCE_SALES_VERSION } from "@/lib/legal/consent";

const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "prestigeso_checkout_idempotency";

type StoredCheckoutIdempotency = {
  key: string;
  fingerprint: string;
};

function readStoredCheckoutIdempotency(): StoredCheckoutIdempotency | null {
  const stored = safeStorageGet("session", CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<StoredCheckoutIdempotency>;
    if (
      typeof parsed.key !== "string" ||
      !/^[A-Za-z0-9._:-]{16,128}$/.test(parsed.key) ||
      typeof parsed.fingerprint !== "string" ||
      parsed.fingerprint.length < 1
    ) {
      safeStorageRemove("session", CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
      return null;
    }
    return parsed as StoredCheckoutIdempotency;
  } catch {
    safeStorageRemove("session", CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    return null;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, cartTotal, isHydrated: isCartHydrated } = useCart();

  const [user, setUser] = useState<User | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode | null>(null);
  const isGuest = checkoutMode === "guest";
  const isMember = checkoutMode === "member";
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [checkoutOtpCode, setCheckoutOtpCode] = useState("");
  const [otpVerificationToken, setOtpVerificationToken] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<AddressRow[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [acceptedContractFingerprint, setAcceptedContractFingerprint] =
    useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponUsages, setCouponUsages] = useState<CouponUsageRow[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponRow | null>(null);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [shippingSettings, setShippingSettings] = useState(
    DEFAULT_SHIPPING_SETTINGS,
  );
  const [shippingSettingsReady, setShippingSettingsReady] = useState(false);
  const [shippingSettingsError, setShippingSettingsError] = useState(false);
  const paymentIdempotencyRef = useRef<StoredCheckoutIdempotency | null>(null);
  const paymentInFlightRef = useRef(false);
  const [addressData, setAddressData] = useState<AddressForm>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    district: "",
    neighborhood: "",
    fullAddress: "",
    addressTitle: "",
  });
  const [cities, setCities] = useState<ProvinceOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (message: string, type: NoticeType = "info") => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ message, type });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 3500);
  };

  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (
      isCartHydrated &&
      !loading &&
      !redirecting &&
      (!cartItems || cartItems.length === 0)
    ) {
      setRedirecting(true);
      router.replace("/");
    }
  }, [cartItems, isCartHydrated, router, loading, redirecting]);

  const isPageLoading =
    !isCartHydrated ||
    redirecting ||
    (!loading && (!cartItems || cartItems.length === 0));

  useEffect(() => {
    const initCheckout = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      try {
        const settingsResponse = await fetch("/api/site-settings", {
          method: "GET",
          credentials: "include",
        });
        if (!settingsResponse.ok)
          throw new Error("Kargo ayarları sunucudan alınamadı.");
        const settingsJson = await settingsResponse.json();
        if (!settingsJson?.shipping)
          throw new Error("Kargo ayarları eksik döndü.");
        setShippingSettings(normalizeShippingSettings(settingsJson?.shipping));
        setShippingSettingsReady(true);
        setShippingSettingsError(false);
      } catch (error) {
        console.error("Kargo ayarları yüklenemedi:", error);
        setShippingSettingsReady(false);
        setShippingSettingsError(true);
      }

      if (session) {
        setUser(session.user);
        setCheckoutMode("member");
        setAddressData((prev) => ({
          ...prev,
          email: (session.user.email || "").toString(),
        }));
        const { data: addr, error: addrErr } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", session.user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });
        if (!addrErr && addr && addr.length > 0) {
          setSavedAddresses(addr as AddressRow[]);
          setSelectedAddressId((addr[0] as AddressRow).id);
        }
        setIsCouponsLoading(true);
        const nowIso = new Date().toISOString();
        const { data: couponsData, error: couponsError } = await supabase
          .from("coupons")
          .select(
            "id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, starts_at, ends_at, usage_limit_per_user, usage_limit_total, used_count, is_active, is_member_only",
          )
          .eq("is_active", true)
          .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
          .order("created_at", { ascending: false });
        if (!couponsError && couponsData)
          setCoupons(couponsData as CouponRow[]);
        const { data: usageData } = await supabase
          .from("coupon_usages")
          .select("*")
          .eq("user_id", session.user.id);
        if (usageData) setCouponUsages(usageData as CouponUsageRow[]);
        setIsCouponsLoading(false);
      } else {
        const guestRequested =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("guest") === "1";
        setUser(null);
        setCheckoutMode(guestRequested ? "guest" : null);
        setCoupons([]);
        setCouponUsages([]);
        setSelectedCoupon(null);
        setCouponCode("");
      }

      try {
        // PERF-06: İl listesini sessionStorage'dan cache'le
        const cachedProvinces = safeStorageGet("session", "prestige_provinces");
        if (cachedProvinces) {
          setCities(JSON.parse(cachedProvinces));
        } else {
          const res = await fetch("/api/turkiyeapi/provinces");
          const json = await res.json();
          if (json.status === "OK") {
            const sorted = (json.data as ProvinceOption[]).sort((a, b) =>
              a.name.localeCompare(b.name, "tr"),
            );
            setCities(sorted);
            try {
              safeStorageSet(
                "session",
                "prestige_provinces",
                JSON.stringify(sorted),
              );
            } catch {
              /* invalid response */
            }
          }
        }
      } catch (error) {
        console.error("Şehirler yüklenemedi:", error);
      }
      setLoading(false);
    };
    initCheckout();
  }, []);

  const selectedAddress = useMemo(
    () =>
      selectedAddressId
        ? savedAddresses.find((address) => address.id === selectedAddressId) ||
          null
        : null,
    [savedAddresses, selectedAddressId],
  );
  const contractAddress = useMemo<AddressForm>(
    () => ({
      email: normalizeEmail(addressData.email || user?.email || ""),
      firstName: selectedAddress?.first_name || "",
      lastName: selectedAddress?.last_name || "",
      phone: selectedAddress?.phone || "",
      city: selectedAddress?.city || "",
      district: selectedAddress?.district || "",
      neighborhood: selectedAddress?.neighborhood || "",
      fullAddress: selectedAddress?.full_address || "",
      addressTitle: selectedAddress?.title || "",
    }),
    [addressData.email, selectedAddress, user?.email],
  );
  const usageCountsByCouponId = useMemo(
    () =>
      couponUsages.reduce((acc: Record<number, number>, usage) => {
        acc[usage.coupon_id] = (acc[usage.coupon_id] || 0) + 1;
        return acc;
      }, {}),
    [couponUsages],
  );

  const getCouponProblem = (coupon: CouponRow) => {
    if (!isMember) return "Kuponlar sadece üyeler için geçerlidir.";
    if (Number(cartTotal || 0) < Number(coupon.min_order_amount || 0))
      return `Bu kupon için sepet tutarı en az ${formatMoney(coupon.min_order_amount)} ₺ olmalıdır.`;
    if (
      coupon.usage_limit_total !== null &&
      coupon.usage_limit_total !== undefined &&
      Number(coupon.used_count || 0) >= Number(coupon.usage_limit_total)
    )
      return "Bu kuponun toplam kullanım hakkı dolmuştur.";
    const userUsageCount = usageCountsByCouponId[coupon.id] || 0;
    if (userUsageCount >= Number(coupon.usage_limit_per_user || 1))
      return "Bu kuponu daha önce kullandınız.";
    return null;
  };

  const couponDiscount = useMemo(() => {
    const problem = selectedCoupon ? getCouponProblem(selectedCoupon) : null;
    if (problem) return 0;
    return calculateCouponDiscount(selectedCoupon, Number(cartTotal || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoupon, cartTotal, isMember, usageCountsByCouponId]);
  const subtotalAfterCoupon = useMemo(
    () => Math.max(0, Number(cartTotal || 0) - couponDiscount),
    [cartTotal, couponDiscount],
  );
  const shippingFee = useMemo(
    () => calculateShippingFee(shippingSettings, subtotalAfterCoupon),
    [shippingSettings, subtotalAfterCoupon],
  );
  const remainingForFreeShipping = useMemo(
    () =>
      calculateRemainingForFreeShipping(
        shippingSettings,
        subtotalAfterCoupon,
        shippingFee,
      ),
    [shippingSettings, subtotalAfterCoupon, shippingFee],
  );
  const finalTotal = useMemo(
    () => Math.max(0, subtotalAfterCoupon + shippingFee),
    [subtotalAfterCoupon, shippingFee],
  );
  const checkoutRequestFingerprint = useMemo(
    () =>
      JSON.stringify({
        version: DISTANCE_SALES_VERSION,
        checkoutMode,
        email: normalizeEmail(addressData.email || user?.email || ""),
        address: contractAddress,
        items: [...(cartItems || [])]
          .map((item) => ({
            id: Number(item.id),
            variantId: Number(item.variant_id || 0),
            name: String(item.name || ""),
            price: Number(item.price || 0).toFixed(2),
            quantity: Number(item.quantity || 0),
          }))
          .sort((left, right) =>
            `${left.id}:${left.variantId}`.localeCompare(
              `${right.id}:${right.variantId}`,
            ),
          ),
        couponCode:
          isMember && selectedCoupon && couponDiscount > 0
            ? selectedCoupon.code
            : "",
        couponDiscount: Number(couponDiscount || 0).toFixed(2),
        shippingFee: Number(shippingFee || 0).toFixed(2),
        finalTotal: Number(finalTotal || 0).toFixed(2),
      }),
    [
      addressData.email,
      cartItems,
      checkoutMode,
      contractAddress,
      couponDiscount,
      finalTotal,
      isMember,
      selectedCoupon,
      shippingFee,
      user?.email,
    ],
  );
  const agreeTerms =
    acceptedContractFingerprint === checkoutRequestFingerprint;

  const openContractModal = () => {
    if (!shippingSettingsReady || shippingSettingsError) {
      showNotice(
        "Kargo ve toplam tutar doğrulanamadı. Lütfen sayfayı yenileyip tekrar deneyin.",
        "error",
      );
      return;
    }
    if (!selectedAddress) {
      showNotice("Önce teslimat adresinizi seçin.", "error");
      return;
    }
    setIsContractModalOpen(true);
  };

  useEffect(() => {
    if (!selectedCoupon) return;
    const problem = getCouponProblem(selectedCoupon);
    if (problem) {
      setSelectedCoupon(null);
      showNotice(problem, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotal]);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === "email")
      nextValue = normalizeEmail(value).slice(0, MAX_EMAIL_LENGTH);
    if (name === "phone") nextValue = normalizePhone(value);
    if (name === "firstName" || name === "lastName")
      nextValue = value.slice(0, MAX_NAME_LENGTH);
    if (name === "addressTitle")
      nextValue = value.slice(0, MAX_ADDRESS_TITLE_LENGTH);
    if (name === "fullAddress")
      nextValue = value.slice(0, MAX_FULL_ADDRESS_LENGTH);
    setAddressData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleCitySelect = (cityName: string) => {
    const selectedCity = cities.find((city) => city.name === cityName);
    setDistricts(
      selectedCity
        ? [...selectedCity.districts].sort((a, b) =>
            a.name.localeCompare(b.name, "tr"),
          )
        : [],
    );
    setAddressData((prev) => ({
      ...prev,
      city: cityName,
      district: "",
      neighborhood: "",
    }));
    setNeighborhoods([]);
  };

  const handleDistrictSelect = async (district: LocationOption) => {
    setAddressData((prev) => ({
      ...prev,
      district: district.name,
      neighborhood: "",
    }));
    try {
      const res = await fetch(
        `/api/turkiyeapi/neighborhoods?districtId=${district.id}&limit=1000`,
      );
      const json = await res.json();
      if (json.status === "OK")
        setNeighborhoods(
          (json.data as LocationOption[]).sort((a, b) =>
            a.name.localeCompare(b.name, "tr"),
          ),
        );
    } catch (error) {
      console.error("Mahalleler yüklenemedi:", error);
    }
  };

  const handleNeighborhoodSelect = (neighborhoodName: string) => {
    setAddressData((prev) => ({ ...prev, neighborhood: neighborhoodName }));
  };

  const applyCoupon = (coupon: CouponRow) => {
    const problem = getCouponProblem(coupon);
    if (problem) {
      showNotice(problem, "error");
      return;
    }
    const discount = calculateCouponDiscount(coupon, Number(cartTotal || 0));
    if (discount <= 0) {
      showNotice("Bu kupon mevcut sepet için indirim oluşturmuyor.", "error");
      return;
    }
    setSelectedCoupon(coupon);
    setCouponCode(coupon.code);
    showNotice(`${coupon.code} kuponu uygulandı.`, "success");
  };

  const handleApplyCouponCode = () => {
    const code = normalizeCouponCode(couponCode);
    if (!isMember) {
      showNotice("Kupon kullanmak için giriş yapmalısınız.", "error");
      return;
    }
    if (!code) {
      showNotice("Lütfen kupon kodu girin.", "error");
      return;
    }
    const foundCoupon = coupons.find((coupon) => coupon.code === code);
    if (!foundCoupon) {
      showNotice("Kupon bulunamadı veya aktif değil.", "error");
      return;
    }
    applyCoupon(foundCoupon);
  };

  const removeCoupon = () => {
    setSelectedCoupon(null);
    setCouponCode("");
    showNotice("Kupon kaldırıldı.", "info");
  };

  const handleSaveAddressModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateAddressForm(addressData);
    if (validationError) {
      showNotice(validationError, "error");
      return;
    }
    setIsSavingAddress(true);
    try {
      const cleanedAddress = {
        title: normalizeText(addressData.addressTitle),
        first_name: normalizeText(addressData.firstName),
        last_name: normalizeText(addressData.lastName),
        phone: normalizePhone(addressData.phone),
        city: addressData.city,
        district: addressData.district,
        neighborhood: addressData.neighborhood,
        full_address: normalizeText(addressData.fullAddress),
      };
      if (user) {
        const { data: inserted, error: insErr } = await supabase.rpc(
          "save_my_address",
          {
            p_address_id: null,
            p_address: {
              ...cleanedAddress,
              is_default: savedAddresses.length === 0,
            },
          },
        );
        if (insErr) throw insErr;
        if (
          inserted &&
          typeof inserted === "object" &&
          !Array.isArray(inserted) &&
          Number.isSafeInteger(Number(inserted.id))
        ) {
          const savedAddress = inserted as unknown as AddressRow;
          setSavedAddresses((prev) => [savedAddress, ...prev]);
          setSelectedAddressId(savedAddress.id);
        }
      } else {
        const dummyId = Date.now();
        const newGuestAddr: AddressRow = {
          id: dummyId,
          user_id: "guest",
          ...cleanedAddress,
        };
        setSavedAddresses([newGuestAddr]);
        setSelectedAddressId(dummyId);
      }
      setIsAddressModalOpen(false);
      setAddressData((prev) => ({
        ...prev,
        addressTitle: "",
        firstName: "",
        lastName: "",
        phone: "",
        city: "",
        district: "",
        neighborhood: "",
        fullAddress: "",
      }));
      setDistricts([]);
      setNeighborhoods([]);
      showNotice("Adres kaydedildi.", "success");
    } catch (error: unknown) {
      showNotice("Adres kaydedilemedi: " + getErrorMessage(error), "error");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const validateBeforePay = () => {
    if (!checkoutMode)
      return "Devam etmek için giriş yapın veya üye olmadan devam edin.";
    if (!cartItems || cartItems.length === 0) return "Sepet boş.";
    if (!shippingSettingsReady || shippingSettingsError)
      return "Kargo ve toplam tutar doğrulanamadı. Lütfen sayfayı yenileyip tekrar deneyin.";
    const email = normalizeEmail(addressData.email || user?.email || "");
    if (!isValidEmail(email))
      return "Lütfen geçerli bir e-posta adresi giriniz.";
    if (!selectedAddress) return "Lütfen teslimat adresi seçin/ekleyin.";
    if (!isValidTurkishPhone(selectedAddress.phone))
      return "Seçili adresteki telefon numarası geçerli değil. Lütfen adresi güncelleyin.";
    if (
      !selectedAddress.city ||
      !selectedAddress.district ||
      !selectedAddress.neighborhood ||
      !selectedAddress.full_address
    )
      return "Seçili teslimat adresi eksik. Lütfen yeni adres ekleyin.";
    if (!agreeTerms)
      return "Lütfen Mesafeli Satış ve Ön Bilgilendirme koşullarını onaylayın.";
    return null;
  };

  const handleCompleteOrder = async () => {
    const err = validateBeforePay();
    if (err) {
      showNotice(err, "error");
      return;
    }

    if (isGuest) {
      setIsOtpSending(true);
      try {
        const email = normalizeEmail(addressData.email);
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, purpose: "guest_checkout" }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Doğrulama kodu gönderilemedi.");

        showNotice("Doğrulama kodu e-postanıza gönderildi.", "success");
        setIsOtpModalOpen(true);
      } catch (error: unknown) {
        showNotice(
          getErrorMessage(error, "Doğrulama kodu gönderilemedi."),
          "error",
        );
      } finally {
        setIsOtpSending(false);
      }
      return;
    }

    proceedToPayment();
  };

  const handleVerifyCheckoutOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutOtpCode.length !== 6) {
      showNotice("Lütfen 6 haneli kodu girin.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const email = normalizeEmail(addressData.email);
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: checkoutOtpCode,
          purpose: "guest_checkout",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kod doğrulanamadı.");

      const verificationToken = String(data.verificationToken || "");
      if (!verificationToken)
        throw new Error("Doğrulama kanıtı oluşturulamadı.");
      setOtpVerificationToken(verificationToken);
      setIsOtpModalOpen(false);
      proceedToPayment(verificationToken);
    } catch (error: unknown) {
      showNotice(getErrorMessage(error, "Kod doğrulanamadı."), "error");
      setIsProcessing(false);
    }
  };

  const proceedToPayment = async (verificationToken?: string) => {
    if (paymentInFlightRef.current) return;
    const validationError = validateBeforePay();
    if (validationError) {
      showNotice(validationError, "error");
      setIsProcessing(false);
      return;
    }

    paymentInFlightRef.current = true;
    setIsProcessing(true);
    const storedIdempotency = readStoredCheckoutIdempotency();
    const reusableIdempotency =
      paymentIdempotencyRef.current?.fingerprint ===
      checkoutRequestFingerprint
        ? paymentIdempotencyRef.current
        : storedIdempotency?.fingerprint === checkoutRequestFingerprint
          ? storedIdempotency
          : null;
    const idempotency: StoredCheckoutIdempotency =
      reusableIdempotency || {
        key: window.crypto.randomUUID(),
        fingerprint: checkoutRequestFingerprint,
      };
    const idempotencyKey = idempotency.key;
    paymentIdempotencyRef.current = idempotency;
    safeStorageSet(
      "session",
      CHECKOUT_IDEMPOTENCY_STORAGE_KEY,
      JSON.stringify(idempotency),
    );

    const clearIdempotency = () => {
      if (paymentIdempotencyRef.current?.key === idempotencyKey)
        paymentIdempotencyRef.current = null;
      const currentStored = readStoredCheckoutIdempotency();
      if (!currentStored || currentStored.key === idempotencyKey)
        safeStorageRemove("session", CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    };

    try {
      const shippingAddressObject = {
        email: normalizeEmail(addressData.email || user?.email || ""),
        firstName: selectedAddress?.first_name,
        lastName: selectedAddress?.last_name,
        phone: selectedAddress?.phone,
        city: selectedAddress?.city,
        district: selectedAddress?.district,
        neighborhood: selectedAddress?.neighborhood,
        fullAddress: selectedAddress?.full_address,
        addressTitle: selectedAddress?.title,
      };
      const activeCouponCode =
        isMember && selectedCoupon && couponDiscount > 0
          ? selectedCoupon.code
          : "";
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      };
      if (isMember && currentSession?.access_token) {
        authHeaders["Authorization"] = `Bearer ${currentSession.access_token}`;
      }
      const response = await fetch("/api/paytr/create-token", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          userEmail: normalizeEmail(addressData.email || user?.email || ""),
          items: cartItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            name: item.name,
            variant_id: item.variant_id ?? null,
          })),
          shippingAddress: shippingAddressObject,
          checkoutMode,
          couponCode: activeCouponCode,
          otpVerificationToken: verificationToken || otpVerificationToken,
          expectedTotalAmount: Number(finalTotal.toFixed(2)),
          contractAccepted: true,
          contractVersion: DISTANCE_SALES_VERSION,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const shouldPreserveIdempotency =
          response.status >= 500 ||
          response.status === 429 ||
          response.status === 401 ||
          result?.code === "IDEMPOTENCY_IN_PROGRESS" ||
          result?.code === "CHECKOUT_STATUS_UNCERTAIN";
        if (!shouldPreserveIdempotency) clearIdempotency();
        if (
          result?.code === "QUOTE_CHANGED" ||
          result?.code === "CART_CHANGED" ||
          result?.code === "COUPON_INVALID"
        ) {
          setAcceptedContractFingerprint(null);
        }
        if (result?.code === "COUPON_INVALID") {
          setSelectedCoupon(null);
          setCouponCode("");
        }
        throw new Error(result?.error || "PayTR ödeme başlatılamadı.");
      }
      const paymentUrl = new URL(String(result.iframe_url || ""));
      if (
        paymentUrl.protocol !== "https:" ||
        paymentUrl.hostname !== "www.paytr.com"
      ) {
        throw new Error("PayTR ödeme adresi geçersiz.");
      }
      window.location.replace(paymentUrl.toString());
    } catch (error: unknown) {
      showNotice(getErrorMessage(error, "Ödeme başlatılamadı."), "error");
    } finally {
      paymentInFlightRef.current = false;
      setIsProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">
        Yükleniyor...
      </div>
    );

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-6 md:py-12 px-4 font-sans text-black pb-28 md:pb-20">
      {notice && <NoticeToast notice={notice} />}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 space-y-5 md:space-y-6">
          <section className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
            <button
              type="button"
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="w-full flex items-center justify-between cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3 md:gap-4">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                  1
                </span>
                <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                  Sepetimdeki Ürünler ({cartItems.length})
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  {formatMoney(cartTotal)} ₺
                </span>
                <div
                  className={`w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-all duration-300 ${isCartOpen ? "rotate-180" : ""}`}
                >
                  ▼
                </div>
              </div>
            </button>
            {isCartOpen && (
              <div className="mt-6 border-t border-gray-50 pt-6 space-y-4">
                {cartItems.map((item, index) => {
                  const displayImage =
                    item.images?.[0] || item.image || "/logo.jpeg";
                  const itemPrice =
                    Number(item.discount_price) > 0
                      ? Number(item.discount_price)
                      : Number(item.price || 0);
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex gap-4 items-center"
                    >
                      <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0">
                        <Image
                          width={56}
                          height={56}
                          src={displayImage}
                          className="w-full h-full object-cover mix-blend-multiply"
                          alt={item.name || "Ürün"}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase leading-tight line-clamp-2">
                          {item.name}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {item.quantity || 1} Adet
                        </p>
                      </div>
                      <p className="text-xs font-black">
                        {formatMoney(itemPrice * (item.quantity || 1))} ₺
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!user && !checkoutMode && (
            <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                  2
                </span>
                <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                  Nasıl Devam Etmek İstersiniz?
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/login?redirect=/checkout")}
                  className="rounded-2xl bg-black text-white p-5 text-left active:scale-[0.98] transition-all"
                >
                  <p className="text-sm font-black uppercase tracking-widest">
                    Giriş Yap / Kaydol
                  </p>
                  <p className="text-xs font-medium text-white/70 mt-2">
                    Kuponlar, kayıtlı adresler ve sipariş takibi için önerilir.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutMode("guest")}
                  className="rounded-2xl bg-gray-50 border border-gray-200 text-black p-5 text-left active:scale-[0.98] transition-all"
                >
                  <p className="text-sm font-black uppercase tracking-widest">
                    Üye Olmadan Devam Et
                  </p>
                  <p className="text-xs font-medium text-gray-500 mt-2">
                    E-posta, telefon ve teslimat adresiyle hızlıca ödeme yapın.
                  </p>
                </button>
              </div>
            </section>
          )}

          {checkoutMode && (
            <>
              <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-50">
                  <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm">
                    {user ? 2 : 3}
                  </span>
                  <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                    Teslimat Adresi
                  </h2>
                </div>
                {isGuest && (
                  <div className="mb-6">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      E-Posta Adresiniz *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      maxLength={MAX_EMAIL_LENGTH}
                      value={addressData.email}
                      onChange={handleInputChange}
                      placeholder="Sipariş bilgilendirmesi için gerekli"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((addr) => {
                    const active = selectedAddressId === addr.id;
                    return (
                      <label
                        key={addr.id}
                        className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${active ? "border-black bg-gray-50 shadow-md" : "border-gray-100 hover:border-gray-200"}`}
                        onClick={() => setSelectedAddressId(addr.id)}
                      >
                        <input
                          type="radio"
                          checked={active}
                          onChange={() => {}}
                          className="mt-1 accent-black w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded">
                            {addr.title}
                          </span>
                          <p className="text-sm font-bold mt-2">
                            {addr.first_name} {addr.last_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {addr.full_address}
                          </p>
                          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase">
                            {addr.district} / {addr.city}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 hover:border-black hover:text-black transition-all min-h-[120px]"
                  >
                    <span className="text-2xl font-light leading-none mb-1">
                      +
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Yeni Adres Ekle
                    </span>
                  </button>
                </div>
              </section>
              {isMember && (
                <section className="bg-white p-5 md:p-7 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-base md:text-lg font-black uppercase tracking-tighter text-black">
                        Kuponlarım
                      </h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Sadece üyelere özel
                      </p>
                    </div>
                    {selectedCoupon && (
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl"
                      >
                        Kuponu Kaldır
                      </button>
                    )}
                  </div>
                  {isCouponsLoading ? (
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-3">
                      <p className="text-xs font-bold text-gray-400 animate-pulse">
                        Kuponlar yükleniyor...
                      </p>
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-3">
                      <p className="text-xs font-bold text-gray-500">
                        Şu an kullanılabilir kayıtlı kupon bulunmuyor.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {coupons.map((coupon) => {
                        const problem = getCouponProblem(coupon);
                        const active = selectedCoupon?.id === coupon.id;
                        const discount = calculateCouponDiscount(
                          coupon,
                          Number(cartTotal || 0),
                        );
                        return (
                          <button
                            key={coupon.id}
                            type="button"
                            onClick={() => applyCoupon(coupon)}
                            className={`text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] ${active ? "border-black bg-black text-white shadow-lg" : problem ? "border-gray-100 bg-gray-50 text-gray-400" : "border-gray-200 bg-white text-black hover:border-black"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                  {coupon.code}
                                </p>
                                <p className="text-sm font-black mt-1">
                                  {coupon.name}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${active ? "bg-white text-black" : "bg-black text-white"}`}
                              >
                                {getCouponLabel(coupon)}
                              </span>
                            </div>
                            {coupon.description && (
                              <p
                                className={`text-[11px] font-medium mt-2 leading-relaxed ${active ? "text-white/70" : "text-gray-500"}`}
                              >
                                {coupon.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-current/10">
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                                Min. {formatMoney(coupon.min_order_amount)} ₺
                              </p>
                              {problem ? (
                                <p className="text-[10px] font-black text-right">
                                  Uygun değil
                                </p>
                              ) : (
                                <p className="text-[10px] font-black text-right">
                                  -{formatMoney(discount)} ₺
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) =>
                        setCouponCode(normalizeCouponCode(event.target.value))
                      }
                      placeholder="Kupon kodu ekle"
                      className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCouponCode}
                      className="bg-black text-white px-5 rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                      Uygula
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        <CheckoutSummary
          cartTotal={Number(cartTotal || 0)}
          couponDiscount={couponDiscount}
          selectedCoupon={selectedCoupon}
          shippingFee={shippingFee}
          remainingForFreeShipping={remainingForFreeShipping}
          finalTotal={finalTotal}
          agreeTerms={agreeTerms}
          shippingSettingsReady={shippingSettingsReady && !shippingSettingsError}
          onTermsChange={(checked) => {
            if (checked) openContractModal();
            else setAcceptedContractFingerprint(null);
          }}
          openContractModal={openContractModal}
          handleCompleteOrder={handleCompleteOrder}
          isProcessing={isProcessing || isOtpSending}
          checkoutMode={checkoutMode}
        />
      </div>
      <CheckoutContractModal
        isOpen={isContractModalOpen}
        cartItems={cartItems}
        address={contractAddress}
        cartTotal={Number(cartTotal || 0)}
        couponDiscount={couponDiscount}
        shippingFee={shippingFee}
        finalTotal={finalTotal}
        onClose={() => setIsContractModalOpen(false)}
        onApprove={() => {
          setAcceptedContractFingerprint(checkoutRequestFingerprint);
          setIsContractModalOpen(false);
        }}
      />
      <CheckoutAddressModal
        isOpen={isAddressModalOpen}
        isSaving={isSavingAddress}
        address={addressData}
        cities={cities}
        districts={districts}
        neighborhoods={neighborhoods}
        onClose={() => setIsAddressModalOpen(false)}
        onSubmit={handleSaveAddressModal}
        onInputChange={handleInputChange}
        onCitySelect={handleCitySelect}
        onDistrictSelect={handleDistrictSelect}
        onNeighborhoodSelect={handleNeighborhoodSelect}
      />

      {isOtpModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsOtpModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200 flex items-center justify-center"
            >
              ✕
            </button>
            <h2 className="text-xl font-black uppercase tracking-tight text-center mb-2">
              E-Posta Doğrulama
            </h2>
            <p className="text-sm font-medium text-gray-500 text-center mb-6">
              Siparişi tamamlamak için{" "}
              <strong className="text-black">
                {normalizeEmail(addressData.email)}
              </strong>{" "}
              adresine gönderilen 6 haneli kodu giriniz.
            </p>
            <form
              onSubmit={handleVerifyCheckoutOtp}
              className="flex flex-col gap-4"
            >
              <input
                type="text"
                value={checkoutOtpCode}
                onChange={(e) =>
                  setCheckoutOtpCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                placeholder="000000"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-3xl tracking-[0.5em] text-center outline-none text-black transition-all focus:border-black"
                required
              />
              <button
                type="submit"
                disabled={isProcessing || checkoutOtpCode.length !== 6}
                className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 mt-2"
              >
                {isProcessing ? "Doğrulanıyor..." : "Doğrula ve Öde"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
