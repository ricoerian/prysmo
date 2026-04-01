"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";

type Phase = "splash" | "animating" | "login";

export default function SplashPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("splash");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // If already logged in, bounce to dashboard.
  // Use redirect:"manual" so middleware's 307→/login isn't followed (that would give res.ok=true on the login HTML).
  useEffect(() => {
    fetch("/api/dashboard", { redirect: "manual" }).then((res) => {
      if (res.ok) router.replace("/dashboard");
    });
  }, [router]);

  // Focus email when login form appears
  useEffect(() => {
    if (phase === "login") {
      const t = setTimeout(() => emailRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function handleLoginClick() {
    setPhase("animating");
    // After dome covers screen, reveal login form
    setTimeout(() => setPhase("login"), 650);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Email atau kata sandi salah");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  const isAnimating = phase === "animating";
  const isLogin = phase === "login";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .splash-root {
          position: fixed; inset: 0;
          overflow: hidden;
          background: #fff5f5;
          font-family: 'Inter', sans-serif;
        }

        /* ── PRYSMO title ── */
        .splash-title-wrap {
          position: absolute;
          top: 18%;
          left: 0; right: 0;
          text-align: center;
          z-index: 2;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.4s ease;
          pointer-events: none;
        }
        .splash-title-wrap.hide {
          transform: translateY(-60px);
          opacity: 0;
        }
        .splash-title-text {
          font-size: clamp(52px, 16vw, 88px);
          font-weight: 900;
          color: #dc2626;
          letter-spacing: 0.18em;
          line-height: 1;
          text-shadow: 0 4px 24px rgba(220,38,38,0.18);
        }
        .splash-title-sub {
          font-size: 12px;
          color: #cd9090;
          letter-spacing: 0.3em;
          font-weight: 600;
          margin-top: 10px;
          text-transform: uppercase;
        }

        /* ── Tagline / subtitle ── */
        .splash-tagline {
          position: absolute;
          top: 40%;
          left: 0; right: 0;
          text-align: center;
          z-index: 2;
          pointer-events: none;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.4s ease;
        }
        .splash-tagline.hide {
          transform: translateY(-60px);
          opacity: 0;
        }
        .splash-tagline p {
          font-size: 14px;
          color: #b47a7a;
          font-weight: 500;
        }

        /* ── Log In button ── */
        .splash-btn-wrap {
          position: absolute;
          top: 48%;
          left: 0; right: 0;
          display: flex;
          justify-content: center;
          z-index: 10;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .splash-btn-wrap.hide {
          transform: translateY(-30px);
          opacity: 0;
          pointer-events: none;
        }
        .splash-btn {
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 9999px;
          padding: 15px 48px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          letter-spacing: 0.08em;
          box-shadow: 0 8px 32px rgba(220,38,38,0.35),
                      0 2px 8px rgba(220,38,38,0.2);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .splash-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(220,38,38,0.4);
        }
        .splash-btn:active {
          transform: translateY(0);
        }

        /* ── Dome (red semicircle) ── */
        .splash-dome {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 150vw;
          height: 30vh;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
          background: #dc2626;
          transform: translateX(-50%);
          z-index: 1;
          transition:
            height 0.65s cubic-bezier(0.65, 0, 0.35, 1),
            width 0.65s cubic-bezier(0.65, 0, 0.35, 1),
            border-radius 0.65s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .splash-dome.expanded {
          width: 100vw;
          height: 100vh;
          border-radius: 0;
        }

        /* ── Decorative dots on dome ── */
        .dome-decor {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          pointer-events: none;
        }

        /* ── Login form (rendered inside dome when expanded) ── */
        .login-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s;
          pointer-events: none;
        }
        .login-overlay.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .login-logo {
          font-size: clamp(32px, 10vw, 48px);
          font-weight: 900;
          color: white;
          letter-spacing: 0.18em;
          margin-bottom: 6px;
          text-shadow: 0 4px 12px rgba(220,38,38,0.25);
        }
        .login-logo-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.3em;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 36px;
        }
        .login-card {
          width: 100%;
          max-width: 360px;
          background: white;
          border-radius: 24px;
          padding: 28px 24px;
          box-shadow: 0 20px 60px rgba(220,38,38,0.15);
        }
        .login-card h2 {
          font-size: 22px;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 4px;
        }
        .login-card p {
          font-size: 13px;
          color: #888;
          margin-bottom: 24px;
        }
        .lf-group {
          margin-bottom: 16px;
        }
        .lf-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }
        .lf-input-wrap {
          position: relative;
        }
        .lf-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #aaa;
          pointer-events: none;
        }
        .lf-input {
          width: 100%;
          border: 1.5px solid rgba(220,38,38,0.12);
          border-radius: 12px;
          padding: 11px 14px 11px 40px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          color: #1a1a1a;
          background: #fafafa;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .lf-input:focus {
          border-color: #dc2626;
          background: white;
        }
        .lf-input::placeholder { color: #bbb; }
        .lf-eye {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #aaa;
          padding: 8px;
        }
        .lf-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 10px 14px;
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .lf-submit {
          width: 100%;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 13px 20px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
          transition: background 0.15s ease, transform 0.12s ease;
        }
        .lf-submit:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
        }
        .lf-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner-sm {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="splash-root">
        {/* PRYSMO heading */}
        <div className={`splash-title-wrap${isAnimating || isLogin ? " hide" : ""}`}>
          <div className="splash-title-text">PRYSMO</div>
          <div className="splash-title-sub">Manajemen Printer</div>
        </div>

        {/* Tagline */}
        <div className={`splash-tagline${isAnimating || isLogin ? " hide" : ""}`}>
          <p>Pantau stok, kelola pesanan & rencana cetak</p>
        </div>

        {/* Log In button */}
        <div className={`splash-btn-wrap${isAnimating || isLogin ? " hide" : ""}`}>
          <button
            id="splash-login-btn"
            className="splash-btn"
            onClick={handleLoginClick}
          >
            <LogIn size={16} />
            Masuk
          </button>
        </div>

        {/* Red dome */}
        <div className={`splash-dome${isAnimating || isLogin ? " expanded" : ""}`}>
          {/* Decorative circles inside dome */}
          <div className="dome-decor" style={{ width: 180, height: 180, top: 8, right: "15%" }} />
          <div className="dome-decor" style={{ width: 100, height: 100, top: 20, left: "20%" }} />
          <div className="dome-decor" style={{ width: 60, height: 60, bottom: 30, right: "35%" }} />
        </div>

        {/* Login form overlay — sits above the dome when expanded */}
        <div className={`login-overlay${isLogin ? " visible" : ""}`}>
          <div className="login-logo">PRYSMO</div>
          <div className="login-logo-sub">Manajemen Printer</div>

          <div className="login-card">
            <h2>Selamat datang kembali</h2>
            <p>Masuk untuk melanjutkan</p>

            {error && <div className="lf-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="lf-group">
                <label className="lf-label" htmlFor="login-email">Email</label>
                <div className="lf-input-wrap">
                  <Mail size={15} className="lf-icon" />
                  <input
                    ref={emailRef}
                    id="login-email"
                    type="email"
                    className="lf-input"
                    placeholder="admin@prysmo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="lf-group">
                <label className="lf-label" htmlFor="login-password">Kata Sandi</label>
                <div className="lf-input-wrap">
                  <Lock size={15} className="lf-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="lf-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="lf-eye"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className="lf-submit"
                disabled={isPending}
              >
                {isPending
                  ? <span className="spinner-sm" />
                  : <><LogIn size={15} /> Masuk</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
