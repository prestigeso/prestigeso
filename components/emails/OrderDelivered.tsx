import * as React from "react";

interface OrderDeliveredProps {
  orderId: string;
  customerName: string;
}

export const OrderDelivered: React.FC<Readonly<OrderDeliveredProps>> = ({
  orderId,
  customerName,
}) => (
  <div style={{ fontFamily: "sans-serif", color: "#333", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
    <div style={{ textAlign: "center", marginBottom: "30px" }}>
      <h1 style={{ color: "#000", letterSpacing: "2px", textTransform: "uppercase" }}>PRESTIGESO</h1>
    </div>
    
    <div style={{ textAlign: "center", marginBottom: "30px" }}>
      <h2 style={{ fontSize: "24px", color: "#16a34a" }}>Paketiniz Teslim Edildi! 🎉</h2>
    </div>
    
    <h3 style={{ fontSize: "18px", fontWeight: "normal", marginBottom: "20px" }}>
      Merhaba {customerName},
    </h3>
    
    <p style={{ fontSize: "15px", lineHeight: "1.6" }}>
      <strong>{orderId}</strong> numaralı siparişinizin kargo firması tarafından başarıyla teslim edildiğini bildirmek isteriz.
    </p>

    <p style={{ fontSize: "15px", lineHeight: "1.6", marginTop: "20px" }}>
      Ürünlerimizi güzel günlerde kullanmanızı dileriz. Siparişinizle ilgili deneyimlerinizi sitemizden değerlendirmeyi unutmayın!
    </p>

    <p style={{ fontSize: "13px", color: "#777", textAlign: "center", marginTop: "40px" }}>
      © {new Date().getFullYear()} PrestigeSO. Tüm hakları saklıdır.
    </p>
  </div>
);

export default OrderDelivered;
