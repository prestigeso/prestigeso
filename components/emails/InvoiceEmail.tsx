import * as React from "react";

interface InvoiceEmailProps {
  orderId: string;
  customerName: string;
}

export const InvoiceEmail: React.FC<Readonly<InvoiceEmailProps>> = ({
  orderId,
  customerName,
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

    <h2
      style={{ fontSize: "20px", fontWeight: "normal", marginBottom: "20px" }}
    >
      Merhaba {customerName},
    </h2>

    <p style={{ fontSize: "15px", lineHeight: "1.6" }}>
      <strong>{orderId}</strong> numaralı siparişinize ait e-fatura ekte
      gönderilmiştir.
    </p>

    <p style={{ fontSize: "15px", lineHeight: "1.6", marginTop: "20px" }}>
      Bizi tercih ettiğiniz için teşekkür ederiz. İyi günler dileriz.
    </p>

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

export default InvoiceEmail;
