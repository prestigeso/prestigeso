"use client";

import { useCart } from "@/context/CartContext";

export default function CampaignBanner() {
  const { campaignText } = useCart();

  if (!campaignText) return null;

  return (
    <div className="bg-black text-white text-xs font-bold py-2 overflow-hidden relative z-50">
      <div className="whitespace-nowrap animate-marquee flex gap-10">
        <span>{campaignText}</span>
        <span>•</span>
        <span>{campaignText}</span>
        <span>•</span>
        <span>{campaignText}</span>
        <span>•</span>
        <span>{campaignText}</span>
      </div>

      <style jsx>{`
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}