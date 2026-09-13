import React, { useState } from "react";
import {
  Shield,
  Lock,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShoppingBag,
  Calculator,
  Warehouse,
  Truck,
} from "lucide-react";
import axios from "axios";
import { AppUser } from "@/api/accessControl";

interface LoginPageProps {
  onLoginSuccess: (user: AppUser, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("admin@mizan.sa");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await axios.post("/api/v1/core/auth/login", {
        email,
        password,
      });

      const { user, token } = res.data;
      localStorage.setItem("mizan_auth_token", token);
      localStorage.setItem("mizan_active_user_id", String(user.id));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      onLoginSuccess(user, token);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "تعذر تسجيل الدخول. يرجى التحقق من صحة البريد وكلمة المرور.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword("password");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        padding: "20px",
        fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          borderRadius: 24,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Header Branding */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
            padding: "36px 30px 28px",
            textAlign: "center",
            color: "#ffffff",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Shield size={34} color="#ffffff" />
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
            ميزان — نظام ERP ومحاسبة
          </h1>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.9, fontWeight: 500 }}>
            المنظومة المحاسبية المتكاملة لتجارة وتوزيع المواد الغذائية
          </p>
        </div>

        {/* Form Container */}
        <div style={{ padding: "32px 30px" }}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 13,
                marginBottom: 20,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 6,
                  color: "#334155",
                }}
              >
                البريد الإلكتروني
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={18}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mizan.sa"
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 6,
                  color: "#334155",
                }}
              >
                كلمة المرور
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={18}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                border: "none",
                padding: "14px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "transform 0.1s, box-shadow 0.2s",
              }}
            >
              {loading ? "جاري التحقق والولوج..." : "تسجيل الدخول إلى النظام"}
              {!loading && <ArrowLeft size={18} />}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#64748b",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              حسابات تجريبية سريعة بنقرة واحدة:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@mizan.sa")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: email === "admin@mizan.sa" ? "#eff6ff" : "#f8fafc",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1e293b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textAlign: "right",
                }}
              >
                👑 المدير العام
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("cashier@mizan.sa")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: email === "cashier@mizan.sa" ? "#eff6ff" : "#f8fafc",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1e293b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textAlign: "right",
                }}
              >
                🛒 كاشير / مبيعات
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: "#f8fafc",
            padding: "14px 20px",
            textAlign: "center",
            fontSize: 12,
            color: "#64748b",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          نظام ميزان الغذائي المعتمد · متوافق مع هيئة الزكاة والضريبة والجمارك ZATCA
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
