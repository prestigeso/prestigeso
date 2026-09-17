"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import SelectPopover from "./SelectPopover";
import AccessibleDialog from "@/components/ui/AccessibleDialog";
import {
  MAX_ADDRESS_TITLE_LENGTH,
  MAX_FULL_ADDRESS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  type AddressForm,
  type LocationOption,
  type ProvinceOption,
} from "@/lib/checkout/checkoutTypes";

type Props = {
  isOpen: boolean;
  isSaving: boolean;
  address: AddressForm;
  cities: ProvinceOption[];
  districts: LocationOption[];
  neighborhoods: LocationOption[];
  neighborhoodsStatus: "idle" | "loading" | "ready" | "error";
  onRetryNeighborhoods: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onInputChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onCitySelect: (name: string) => void;
  onDistrictSelect: (district: LocationOption) => void;
  onNeighborhoodSelect: (name: string) => void;
};

const inputClass =
  "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all";

export default function CheckoutAddressModal({
  isOpen,
  isSaving,
  address,
  cities,
  districts,
  neighborhoods,
  neighborhoodsStatus,
  onRetryNeighborhoods,
  onClose,
  onSubmit,
  onInputChange,
  onCitySelect,
  onDistrictSelect,
  onNeighborhoodSelect,
}: Props) {
  const [openSelect, setOpenSelect] = useState<
    "city" | "district" | "neighborhood" | null
  >(null);
  const [citySearch, setCitySearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  const filteredCities = useMemo(
    () =>
      cities.filter((item) =>
        item.name
          .toLocaleLowerCase("tr-TR")
          .includes(citySearch.toLocaleLowerCase("tr-TR")),
      ),
    [cities, citySearch],
  );
  const filteredDistricts = useMemo(
    () =>
      districts.filter((item) =>
        item.name
          .toLocaleLowerCase("tr-TR")
          .includes(districtSearch.toLocaleLowerCase("tr-TR")),
      ),
    [districts, districtSearch],
  );
  const filteredNeighborhoods = useMemo(
    () =>
      neighborhoods.filter((item) =>
        item.name
          .toLocaleLowerCase("tr-TR")
          .includes(neighborhoodSearch.toLocaleLowerCase("tr-TR")),
      ),
    [neighborhoods, neighborhoodSearch],
  );

  const close = () => {
    setOpenSelect(null);
    setCitySearch("");
    setDistrictSearch("");
    setNeighborhoodSearch("");
    onClose();
  };
  return (
    <AccessibleDialog open={isOpen} onClose={close} busy={isSaving} labelledBy="checkout-address-title" className="max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl">
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
          <h2 id="checkout-address-title" tabIndex={-1} data-dialog-autofocus className="text-xl font-black uppercase tracking-tight">
            Yeni Adres Ekle
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={onSubmit}
          className="space-y-4 overflow-y-auto pr-2 pb-4 hide-scrollbar"
        >
          <LabeledInput
            label="Adres Başlığı *"
            required
            name="addressTitle"
            maxLength={MAX_ADDRESS_TITLE_LENGTH}
            value={address.addressTitle}
            onChange={onInputChange}
            placeholder="Örn: Evim, İş Yerim"
          />
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              label="Ad *"
              required
              name="firstName"
              maxLength={MAX_NAME_LENGTH}
              value={address.firstName}
              onChange={onInputChange}
              placeholder="Adınız"
            />
            <LabeledInput
              label="Soyad *"
              required
              name="lastName"
              maxLength={MAX_NAME_LENGTH}
              value={address.lastName}
              onChange={onInputChange}
              placeholder="Soyadınız"
            />
          </div>
          <LabeledInput
            label="Telefon *"
            required
            name="phone"
            maxLength={MAX_PHONE_LENGTH}
            value={address.phone}
            onChange={onInputChange}
            placeholder="05XXXXXXXXX"
            type="tel"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LocationField
              label="İl *"
              value={address.city}
              placeholder="İl Seçiniz"
              open={openSelect === "city"}
              onToggle={() =>
                setOpenSelect(openSelect === "city" ? null : "city")
              }
            >
              <SelectPopover
                search={citySearch}
                setSearch={setCitySearch}
                onClose={() => setOpenSelect(null)}
                items={filteredCities}
                getKey={(item) => item.id}
                getLabel={(item) => item.name}
                onPick={(item) => {
                  onCitySelect(item.name);
                  setOpenSelect(null);
                }}
                placeholder="İl Ara..."
              />
            </LocationField>
            <LocationField
              label="İlçe *"
              value={address.district}
              placeholder="İlçe Seçiniz"
              disabled={!address.city}
              open={openSelect === "district"}
              onToggle={() =>
                address.city &&
                setOpenSelect(openSelect === "district" ? null : "district")
              }
            >
              <SelectPopover
                search={districtSearch}
                setSearch={setDistrictSearch}
                onClose={() => setOpenSelect(null)}
                items={filteredDistricts}
                getKey={(item) => item.id}
                getLabel={(item) => item.name}
                onPick={(item) => {
                  void onDistrictSelect(item);
                  setOpenSelect(null);
                }}
                placeholder="İlçe Ara..."
              />
            </LocationField>
            <LocationField
              label="Mahalle *"
              value={address.neighborhood}
              placeholder="Mahalle Seçiniz"
              disabled={!address.district || neighborhoodsStatus !== "ready"}
              open={openSelect === "neighborhood"}
              onToggle={() =>
                address.district && neighborhoodsStatus === "ready" &&
                setOpenSelect(
                  openSelect === "neighborhood" ? null : "neighborhood",
                )
              }
            >
              <SelectPopover
                search={neighborhoodSearch}
                setSearch={setNeighborhoodSearch}
                onClose={() => setOpenSelect(null)}
                items={filteredNeighborhoods}
                getKey={(item) => item.id || item.name}
                getLabel={(item) => item.name}
                onPick={(item) => {
                  onNeighborhoodSelect(item.name);
                  setOpenSelect(null);
                }}
                placeholder="Mahalle Ara..."
                emptyText={
                  neighborhoods.length === 0 ? "Bu ilçe için mahalle bulunamadı" : "Sonuç yok"
                }
              />
            </LocationField>
          </div>
          {neighborhoodsStatus === "loading" && <p role="status" className="text-sm text-gray-600">Mahalleler yükleniyor...</p>}
          {neighborhoodsStatus === "error" && (
            <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              Mahalleler yüklenemedi. Adres bilgileriniz korundu.
              <button type="button" onClick={onRetryNeighborhoods} className="ml-2 font-bold underline">Tekrar dene</button>
            </div>
          )}
          {neighborhoodsStatus === "ready" && neighborhoods.length === 0 && <p role="status" className="text-sm text-amber-800">Bu ilçe için mahalle bulunamadı. İlçe seçimini kontrol edin.</p>}
          <div>
            <label htmlFor="checkout-full-address" className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
              Açık Adres *
            </label>
            <textarea
              required
              name="fullAddress"
              id="checkout-full-address"
              maxLength={MAX_FULL_ADDRESS_LENGTH}
              value={address.fullAddress}
              onChange={onInputChange}
              rows={3}
              placeholder="Cadde, sokak, bina ve diğer bilgileri giriniz."
              className={`${inputClass} resize-none`}
            />
          </div>
          <button
            type="submit"
            disabled={isSaving || neighborhoodsStatus !== "ready" || !address.neighborhood}
            className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-md active:scale-95 transition-all mt-4"
          >
            {isSaving ? "Kaydediliyor..." : "Adresi Kaydet 📍"}
          </button>
        </form>
      </div>
    </AccessibleDialog>
  );
}

function LabeledInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label htmlFor={props.name} className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
        {label}
      </label>
      <input {...props} id={props.name} className={inputClass} />
    </div>
  );
}

function LocationField({
  label,
  value,
  placeholder,
  disabled,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) trigger.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);
  return (
    <div className="relative">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
        {label}
      </label>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-label={label}
        aria-expanded={open}
        className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium flex justify-between items-center text-left ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className={value ? "text-black line-clamp-1" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <span className="text-[10px]">▼</span>
      </button>
      {open && children}
    </div>
  );
}
