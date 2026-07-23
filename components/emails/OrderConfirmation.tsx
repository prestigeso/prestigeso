import * as React from "react";

interface OrderConfirmationProps {
  orderId: string;
  customerName: string;
  items: Array<{
    name?: string;
    price?: number | string;
    quantity?: number | string;
  }>;
  totalAmount: number;
  trackingUrl?: string;
}

export const OrderConfirmation: React.FC<Readonly<OrderConfirmationProps>> = ({
  orderId,
  customerName,
  items,
  totalAmount,
  trackingUrl,
}) => (
  <div
    style={{
      fontFamily: "sans-serif",
      color: "#333",
      maxWidth: "600px",
      margin: "0 auto",
      padding: "20px",
    }}
  >
    <div style={{ textAlign: "center", marginBottom: "30px" }}>
      <h1
        style={{
          color: "#000",
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        PRESTIGESO
      </h1>
    </div>

    {trackingUrl && (
      <div style={{ textAlign: "center", margin: "24px 0" }}>
        <a
          href={trackingUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#000",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          Siparişi Takip Et
        </a>
      </div>
    )}

    <h2
      style={{ fontSize: "20px", fontWeight: "normal", marginBottom: "20px" }}
    >
      Merhaba {customerName},
    </h2>

    <p style={{ fontSize: "15px", lineHeight: "1.6" }}>
      Siparişiniz başarıyla alınmıştır. Bizi tercih ettiğiniz için teşekkür
      ederiz. Siparişiniz hazırlandığında ve kargoya verildiğinde sizi tekrar
      bilgilendireceğiz.
    </p>

    <div
      style={{
        margin: "30px 0",
        padding: "20px",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
      }}
    >
      <h3
        style={{ marginTop: 0, fontSize: "16px", textTransform: "uppercase" }}
      >
        Sipariş Özeti ({orderId})
      </h3>
      <hr
        style={{
          border: "none",
          borderTop: "1px solid #ddd",
          margin: "15px 0",
        }}
      />

      {items.map((item, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span style={{ fontSize: "14px" }}>
            {item.quantity}x {item.name}
          </span>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>
            {(
              Number(item.price || 0) * Number(item.quantity || 0)
            ).toLocaleString("tr-TR")}{" "}
            ₺
          </span>
        </div>
      ))}

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #ddd",
          margin: "15px 0",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "10px",
        }}
      >
        <strong style={{ fontSize: "16px" }}>Toplam Ödenen</strong>
        <strong style={{ fontSize: "16px", color: "#e53e3e" }}>
          {Number(totalAmount).toLocaleString("tr-TR")} ₺
        </strong>
      </div>
    </div>

    <p
      style={{
        fontSize: "13px",
        color: "#777",
        textAlign: "center",
        marginTop: "40px",
      }}
    >
      © {new Date().getFullYear()} PrestigeSO. Tüm hakları saklıdır.
    </p>
  </div>
);

export default OrderConfirmation;
