import * as React from "react";

interface OtpEmailProps {
  code: string;
}

export const OtpEmail: React.FC<Readonly<OtpEmailProps>> = ({ code }) => (
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

    <div
      style={{
        textAlign: "center",
        marginBottom: "30px",
        backgroundColor: "#f9f9f9",
        padding: "30px",
        borderRadius: "12px",
      }}
    >
      <h2
        style={{ fontSize: "18px", fontWeight: "normal", marginBottom: "15px" }}
      >
        E-posta Doğrulama Kodunuz
      </h2>

      <p
        style={{
          fontSize: "15px",
          lineHeight: "1.6",
          color: "#555",
          marginBottom: "25px",
        }}
      >
        İşleminize devam edebilmek için aşağıdaki doğrulama kodunu
        kullanabilirsiniz. Kodun geçerlilik süresi <strong>3 dakikadır</strong>.
      </p>

      <div
        style={{
          letterSpacing: "8px",
          fontSize: "32px",
          fontWeight: "bold",
          color: "#111",
          backgroundColor: "#fff",
          padding: "15px 25px",
          borderRadius: "8px",
          display: "inline-block",
          border: "1px solid #eaeaea",
        }}
      >
        {code}
      </div>
    </div>

    <p
      style={{
        fontSize: "13px",
        lineHeight: "1.5",
        color: "#777",
        textAlign: "center",
      }}
    >
      Eğer bu işlemi siz başlatmadıysanız, lütfen bu e-postayı görmezden gelin.
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

export default OtpEmail;
