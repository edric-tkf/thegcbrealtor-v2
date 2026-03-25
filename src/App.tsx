import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Routes, Route, useNavigate, useParams, Link, useLocation, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// ─── Config ───────────────────────────────────────────────────────────────────
const AUTH_KEY = "gcb_auth_v2";
const API_LISTINGS = "https://www.realstarpremier.com/api/agents/4554/properties";
const WHATSAPP_NO = "6590069222";
const AGENT_PHOTO = "https://edricteokf-resources.s3.ap-southeast-1.amazonaws.com/emilyho_agent_withbackground.png";
const REALTOR_IMG = "https://edricteokf-resources.s3.ap-southeast-1.amazonaws.com/emilyho-tpbg.png";
const PAGE_SIZE = 16;
const ADMIN_PIN = "2809";

const ET_OAUTH_URL = "https://et-central.softr.app";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDl8vRwx-bRttBipdZpjfT5onlfzOu6w9M",
  authDomain: "et-core-f7d05.firebaseapp.com",
  databaseURL: "https://et-core-f7d05-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "et-core-f7d05",
  storageBucket: "et-core-f7d05.firebasestorage.app",
  messagingSenderId: "960940896695",
  appId: "1:960940896695:web:4304905d835a8823afb832",
};

function isAuthValid() {
  try {
    const exp = parseInt(localStorage.getItem(AUTH_KEY + "_exp") || "0", 10);
    if (!exp) return false;
    const now = new Date(), expDate = new Date(exp);
    return now < expDate && now.toDateString() === expDate.toDateString();
  } catch { return false; }
}
function saveAuth() {
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  localStorage.setItem(AUTH_KEY + "_exp", String(endOfDay.getTime()));
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function getImages(p: any) {
  const wm = (p.IMAGES || []).filter((img: any) => img?.startsWith("http") && img.includes("watermarked"));
  if (wm.length) return wm;
  if (p.PROFILE_IMAGE_URL?.startsWith("http")) return [p.PROFILE_IMAGE_URL];
  return [];
}
function stripHtml(html: string) {
  if (!html) return "";
  const normalized = html.replace(/<br\s*\/?>/gi, "\n");
  const doc = new DOMParser().parseFromString(normalized, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const WAIcon = ({ size = 15 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>);
const SearchIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
const BedIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9h20M2 15h20M2 5h20v14H2z" /></svg>;
const SqftIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18M9 21V9" /></svg>;
const PhoneIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const LinkIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;

// ─── Firebase OTP hook ────────────────────────────────────────────────────────
function useFirebaseOTP(onSuccess: () => void) {
  const recaptchaRef = useRef<any>(null);
  const confirmRef = useRef<any>(null);
  const digitRefs = useRef < any[] > ([]);
  const [step, setStep] = useState("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [formMsg, setFormMsg] = useState<any>(null);
  const [otpMsg, setOtpMsg] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const loadScript = (src: string) => new Promise < void> ((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = () => res(); s.onerror = rej;
      document.head.appendChild(s);
    });

    const init = async () => {
      try {
        if (!(window as any).firebase) {
          await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
          await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");
          await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js");
        }
        if (!(window as any).firebase.apps.find((a: any) => a.name === "emily-ho")) {
          (window as any).firebase.initializeApp(FIREBASE_CONFIG, "emily-ho");
        }
      } catch (e) { console.error("Firebase load error", e); }
    };
    init();
  }, []);

  const getMyAuth = () => {
    const app = (window as any).firebase.apps.find((a: any) => a.name === "emily-ho");
    return app ? app.auth() : null;
  };

  const setupRecaptcha = () => {
    const auth = getMyAuth();
    if (!auth || recaptchaRef.current) return;
    recaptchaRef.current = new (window as any).firebase.auth.RecaptchaVerifier("rs-recaptcha-container", {
      size: "normal"
    }, auth.app);
    recaptchaRef.current.render();
  };

  const sendOtp = async () => {
    const auth = getMyAuth();
    setFormMsg(null);
    if (!name.trim()) return setFormMsg({ text: "Please enter your name.", type: "error" });
    const digits = phone.replace(/\s/g, "");
    if (!/^\d{8}$/.test(digits)) return setFormMsg({ text: "Please enter a valid 8-digit Singapore number.", type: "error" });
    if (!recaptchaRef.current) return setFormMsg({ text: "reCAPTCHA not ready.", type: "error" });

    setSending(true);
    try {
      confirmRef.current = await auth.signInWithPhoneNumber(`+65${digits}`, recaptchaRef.current);
      setStep("otp");
    } catch (err: any) {
      setFormMsg({ text: err.message, type: "error" });
    }
    setSending(false);
  };

  const verifyOtp = async () => {
    setOtpMsg(null);
    const code = otpDigits.join("");
    if (code.length < 6) return setOtpMsg({ text: "Enter 6-digit code.", type: "error" });
    setVerifying(true);
    try {
      await confirmRef.current.confirm(code);
      const app = (window as any).firebase.apps.find((a: any) => a.name === "emily-ho");
      await app.database().ref("gcb_visitors").push({ name, phone: `+65${phone}`, timestamp: new Date().toISOString() });
      setOtpMsg({ text: "Verified!", type: "success" });
      setTimeout(() => { saveAuth(); onSuccess(); }, 800);
    } catch {
      setOtpMsg({ text: "Incorrect code.", type: "error" });
    }
    setVerifying(false);
  };

  const handleDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits]; next[i] = v; setOtpDigits(next);
    if (v && i < 5) digitRefs.current[i + 1]?.focus();
  };

  return { step, setStep, name, setName, phone, setPhone, otpDigits, handleDigit, digitRefs, formMsg, otpMsg, sending, verifying, sendOtp, verifyOtp, setupRecaptcha };
}

// ─── Components ───────────────────────────────────────────────────────────────

function AuthGate({ onAuthenticated, onClose }: { onAuthenticated: () => void, onClose: () => void }) {
  const [adminMode, setAdminMode] = useState("link");
  const [adminPin, setAdminPin] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const otp = useFirebaseOTP(onAuthenticated);

  useEffect(() => {
    const t = setTimeout(() => otp.setupRecaptcha(), 800);
    return () => clearTimeout(t);
  }, []);

  const handleAdminPin = () => {
    if (adminPin === ADMIN_PIN) { saveAuth(); onAuthenticated(); }
    else setAdminErr("Incorrect PIN.");
  };

  const handleETLogin = () => {
    const oauthUrl = new URL(ET_OAUTH_URL);
    oauthUrl.searchParams.append("redirect_uri", window.location.origin + window.location.pathname);
    oauthUrl.searchParams.append("client_name", "Emily Ho - GCB Listings");
    window.location.href = oauthUrl.toString();
  };

  return (
    <div className="rs-auth-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="rs-auth-box">
        <button className="rs-auth-close" onClick={onClose}>✕</button>
        <div className="rs-auth-header">
          <img src={AGENT_PHOTO} alt="Emily Ho" className="rs-auth-logo" />
          <div className="rs-auth-title">Emily Ho · GCB Listings</div>
          <div className="rs-auth-sub">Verify your identity to access exclusive property details.</div>
        </div>
        <div className="rs-otp-form">
          {adminMode === "link" && otp.step === "form" && (
            <div className="rs-otp-step active">
              <label className="rs-otp-label">Your Name</label>
              <input className="rs-otp-input" type="text" placeholder="e.g. Tan Wei Ming" value={otp.name} onChange={e => otp.setName(e.target.value)} />
              <label className="rs-otp-label">Singapore Mobile Number</label>
              <div className="rs-otp-phone-row">
                <span className="rs-otp-prefix">🇸🇬 +65</span>
                <input className="rs-otp-input" type="tel" placeholder="9123 4567" maxLength={9} value={otp.phone} onChange={e => otp.setPhone(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div id="rs-recaptcha-container" style={{ marginBottom: 10 }} />
              <button className="rs-otp-btn" onClick={otp.sendOtp} disabled={otp.sending}>{otp.sending ? "Sending…" : "Send OTP →"}</button>
              {otp.formMsg && <div className={`rs-otp-msg ${otp.formMsg.type}`}>{otp.formMsg.text}</div>}
            </div>
          )}
          {adminMode === "choice" && (
            <div className="rs-otp-step active" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
              <button className="rs-otp-btn" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setAdminMode("pin")}>Enter Admin PIN</button>
              <button className="rs-otp-btn" style={{ background: '#000', border: '1px solid #b8892e' }} onClick={handleETLogin}>Login with ET Identity</button>
              <button className="rs-otp-back" onClick={() => setAdminMode("link")}>Cancel</button>
            </div>
          )}
          {adminMode === "pin" && (
            <div className="rs-otp-step active">
              <div className="rs-admin-pin-row">
                <input className="rs-admin-pin-input" type="password" placeholder="••••" maxLength={4} autoFocus value={adminPin} onChange={e => setAdminPin(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminPin()} />
                <button className="rs-admin-pin-btn" onClick={handleAdminPin}>Enter</button>
              </div>
              <button className="rs-otp-back" onClick={() => setAdminMode("choice")}>Back</button>
              {adminErr && <div className="rs-otp-msg error" style={{ marginTop: 12 }}>{adminErr}</div>}
            </div>
          )}
          {otp.step === "otp" && (
            <div className="rs-otp-step active">
              <div className="rs-otp-digit-row">
                {otp.otpDigits.map((d, i) => (
                  <input key={i} className="rs-otp-digit" maxLength={1} ref={el => { otp.digitRefs.current[i] = el; }} value={d} onChange={e => otp.handleDigit(i, e.target.value)} />
                ))}
              </div>
              <button className="rs-otp-btn" onClick={otp.verifyOtp} disabled={otp.verifying}>Verify & Enter →</button>
              <button className="rs-otp-back" onClick={() => otp.setStep("form")}>← Change number</button>
              {otp.otpMsg && <div className={`rs-otp-msg ${otp.otpMsg.type}`}>{otp.otpMsg.text}</div>}
            </div>
          )}
        </div>
        <div className="rs-auth-divider" />
        <div className="rs-auth-admin-footer">
          {adminMode === "link" && <button className="rs-auth-admin-link" onClick={() => setAdminMode("choice")}>Admin access</button>}
        </div>
      </div>
    </div>
  );
}

function MobileCarousel({ images, ytId }: { images: string[], ytId: string | null }) {
  const items = useMemo(() => {
    const res: any[] = [];
    if (ytId) res.push({ type: "video", ytId });
    images.forEach((src, i) => res.push({ type: "photo", src, i }));
    return res;
  }, [images, ytId]);

  const [idx, setIdx] = useState(0);
  if (!items.length) return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)", background: "#111" }}>No media available</div>;
  const prev = () => setIdx(x => (x - 1 + items.length) % items.length);
  const next = () => setIdx(x => (x + 1) % items.length);
  const cur = items[idx];

  return (
    <div className="rs-carousel-wrap">
      <div className="rs-carousel-slide">
        {cur.type === "video" ? (
          <div className="rs-carousel-item-video">
            <span className="rs-carousel-video-label">▶ Video Tour</span>
            <iframe src={`https://www.youtube.com/embed/${cur.ytId}`} allowFullScreen title="Property video" />
          </div>
        ) : (
          <div className="rs-carousel-item-photo">
            <img src={cur.src} alt={`Photo ${cur.i + 1}`} />
            <span className="rs-carousel-wm">Emily Ho · 90069222</span>
          </div>
        )}
      </div>
      {items.length > 1 && (
        <>
          <button className="rs-carousel-nav prev" onClick={prev}>‹</button>
          <button className="rs-carousel-nav next" onClick={next}>›</button>
          <div className="rs-carousel-dots">
            {items.map((_, i) => (
              <button key={i} className={`rs-carousel-dot ${i === idx ? "active" : ""}`} onClick={() => setIdx(i)} />
            ))}
          </div>
        </>
      )}
      <div className="rs-carousel-counter">{idx + 1} / {items.length}</div>
    </div>
  );
}

function PropertyCard({ property, idx }: any) {
  const [visible, setVisible] = useState(false);
  const [imgIdx] = useState(0);
  const [imgErr, setImgErr] = useState(false);
  const images = getImages(property);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), Math.min(idx * 45, 520));
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <Link to={`/property/${property.id}`} className={`rs-card ${visible ? "visible" : ""}`} style={{ animationDelay: `${Math.min(idx * 45, 520)}ms` }}>
      <div className="rs-img-zone">
        {!imgErr && images[imgIdx]
          ? <img src={images[imgIdx]} alt={property.HEADER_TITLE} onError={() => setImgErr(true)} />
          : <div className="rs-no-img">No image</div>}
        <div className="rs-img-hover-overlay"><span className="rs-img-hover-text">View Details</span></div>
        <span className="rs-img-watermark">Emily Ho · 90069222</span>
        <span className="rs-type-badge">{property.PROPERTY_TYPE}</span>
        {property.TENURE && <span className="rs-tenure-badge">{property.TENURE}</span>}
      </div>
      <div className="rs-card-body">
        <div className="rs-card-district">D{property.DISTRICT} · {property.AREA}</div>
        <div className="rs-card-title">{property.HEADER_TITLE}</div>
        <div className="rs-price">{property.SELLING_PRICE || "Price on request"}</div>
        <div className="rs-stats">
          {property.ROOMS && <span className="rs-stat"><BedIcon />{property.ROOMS} Bed</span>}
          {property.LANDSIZE_SQFT && <span className="rs-stat"><SqftIcon />{property.LANDSIZE_SQFT} sqft</span>}
        </div>
        <div className="rs-chips">
          {property.CONDITION && <span className="rs-chip">{property.CONDITION}</span>}
          {property.PSF && <span className="rs-chip rs-chip-gold">S${property.PSF} psf</span>}
        </div>
      </div>
      <div className="rs-card-footer">
        <div className="rs-view-hint"><span>View Details</span><span className="rs-arrow">→</span></div>
      </div>
    </Link>
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function HomePage({ allGcb, loading, error, loadAll }: any) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [page, setPage] = useState(1);
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const targets = [headerRef.current, mobileHeaderRef.current].filter((el): el is HTMLDivElement => el !== null);
    if (!targets.length) return;
    const obs = new IntersectionObserver(entries => setHeaderVisible(entries.some(e => e.isIntersecting)), { threshold: 0.05 });
    targets.forEach(t => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q ? allGcb.filter((p: any) =>
    (p.HEADER_TITLE || "").toLowerCase().includes(q) ||
    (p.AREA || "").toLowerCase().includes(q) ||
    (p.DISTRICT || "").toString().includes(q)
  ) : allGcb;

  const sorted = [...filtered];
  if (sortBy === "price-asc") sorted.sort((a, b) => parseInt((a.SELLING_PRICE || "0").replace(/\D/g, "")) - parseInt((b.SELLING_PRICE || "0").replace(/\D/g, "")));
  if (sortBy === "price-desc") sorted.sort((a, b) => parseInt((b.SELLING_PRICE || "0").replace(/\D/g, "")) - parseInt((a.SELLING_PRICE || "0").replace(/\D/g, "")));
  if (sortBy === "land-desc") sorted.sort((a, b) => parseInt((b.LANDSIZE_SQFT || "0").replace(/,/g, "")) - parseInt((a.LANDSIZE_SQFT || "0").replace(/,/g, "")));

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayed = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goPage = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <>
      <Helmet>
        <title>Emily Ho | Good Class Bungalow Listings Singapore</title>
        <meta name="description" content="Explore exclusive Good Class Bungalow (GCB) listings in Singapore by Emily Ho, Principal Consultant at Realstar Premier." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.thegcbrealtor.com/" />
        <script src="https://cdn.tailwindcss.com"></script>
      </Helmet>

      <div className="rs-header" ref={headerRef}>
        <div className="rs-header-bg" />
        <div className="rs-photo-wrap"><img src={REALTOR_IMG} alt="Emily Ho" className="rs-photo" /></div>
        <div className="rs-agent-info">
          <div className="rs-agency-label">Realstar Premier</div>
          <div className="rs-agent-name">Emily Ho</div>
          <div className="rs-agent-phone">9006 9222</div>
          <div className="rs-agent-rank">Principal Consultant</div>
          <a className="rs-header-wa" href={`https://wa.me/${WHATSAPP_NO}?text=Hi Emily, I'm interested in your GCB listings.`} target="_blank" rel="noopener noreferrer"><WAIcon size={14} /> WhatsApp Emily</a>
        </div>
        <div className="rs-header-title"><h1>Good Class Bungalow Listings</h1></div>
      </div>

      <div ref={mobileHeaderRef}>
        <div className="rs-mobile-header">
          <div className="rs-mobile-photo-wrap"><img src={REALTOR_IMG} alt="Emily Ho" /></div>
          <div className="rs-mobile-content">
            <div className="rs-mobile-agency">Realstar Premier</div>
            <div className="rs-mobile-name">Emily Ho</div>
            <div className="rs-mobile-phone">9006 9222</div>
            <div className="rs-mobile-rank">Principal Consultant</div>
            <a className="rs-mobile-wa" href={`https://wa.me/${WHATSAPP_NO}`} target="_blank" rel="noopener noreferrer"><WAIcon size={13} /> WhatsApp Emily</a>
          </div>
        </div>
        <div className="rs-mobile-page-title">Good Class Bungalow Listings</div>
      </div>

      <div className="rs-sticky">
        <div className="rs-bar">
          <div className={`rs-bar-agent ${!headerVisible ? "visible" : "hidden"}`}>
            <img src={AGENT_PHOTO} alt="Emily Ho" className="rs-bar-agent-img" />
            <div className="rs-bar-agent-text">
              <div className="rs-bar-agent-name">Emily Ho</div>
              <div className="rs-bar-agent-role">Principal Consultant · Realstar Premier</div>
            </div>
            <div className="rs-bar-agent-divider" />
          </div>
          <span className="rs-bar-label">Sort</span>
          <select className="rs-sort-select" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}>
            <option value="default">Default</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="land-desc">Land (Largest)</option>
          </select>
          <div className="rs-search-wrap">
            <span className="rs-search-icon"><SearchIcon /></span>
            <input className="rs-search" type="text" placeholder="Search area, district…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="rs-bar-title">GCB Listings</span>
        </div>
      </div>

      <div className="rs-container">
        <div className="rs-grid">
          {loading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="rs-skeleton-card" style={{ height: 350, background: '#eee', borderRadius: 14 }} />)}
          {!loading && error && <div className="rs-state-center"><p>⚠ {error}</p><button className="rs-retry-btn" onClick={loadAll}>Try Again</button></div>}
          {!loading && !error && displayed.map((p, i) => <PropertyCard key={p.id} property={p} idx={i} />)}
        </div>
        {!loading && totalPages > 1 && (
          <div className="rs-pagination">
            <button className="rs-page-btn" disabled={safePage === 1} onClick={() => goPage(safePage - 1)}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`rs-page-btn ${p === safePage ? "active" : ""}`} onClick={() => goPage(p)}>{p}</button>
            ))}
            <button className="rs-page-btn" disabled={safePage === totalPages} onClick={() => goPage(safePage + 1)}>Next →</button>
          </div>
        )}
      </div>
    </>
  );
}

function PropertyPage({ allGcb, loading }: any) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && allGcb.length) {
      const found = allGcb.find((p: any) => String(p.id) === String(id));
      if (found) setProperty(found);
      else navigate("/", { replace: true });
    }
  }, [id, allGcb, loading, navigate]);

  useEffect(() => {
    if (!isAuthValid()) {
      setShowAuth(true);
    }
  }, []);

  if (loading || !property) return <div className="rs-modal-backdrop" style={{ position: 'fixed', zIndex: 1000 }}><div className="rs-spinner" /></div>;

  const images = getImages(property);
  const ytId = property.VIDEO_URL ? (property.VIDEO_URL.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/) || [])[1] : null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const waMsg = encodeURIComponent(`Hi Emily, I'm interested in:\n\n"${property.HEADER_TITLE}"\nListed at ${property.SELLING_PRICE || "TBD"}\n\n🔗 ${window.location.href}`);

  return (
    <div className="rs-modal-backdrop">
      <Helmet>
        <title>{property.HEADER_TITLE} | Emily Ho GCB Listings</title>
        <meta name="description" content={`${property.PROPERTY_TYPE} in ${property.AREA} (D${property.DISTRICT}). Land: ${property.LANDSIZE_SQFT} sqft. Price: ${property.SELLING_PRICE}.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://www.thegcbrealtor.com/property/${property.id}`} />
        <meta property="og:title" content={property.HEADER_TITLE} />
        <meta property="og:image" content={images[0]} />
        <script src="https://cdn.tailwindcss.com"></script>
      </Helmet>

      {showAuth && <AuthGate onAuthenticated={() => setShowAuth(false)} onClose={() => navigate("/")} />}

      <div className="rs-modal">
        <Link to="/" className="rs-modal-close" style={{ textDecoration: 'none' }}>✕</Link>

        <div className="rs-modal-gallery">
          {ytId && <div className="rs-modal-gallery-video"><iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen /></div>}
          <div className="rs-modal-gallery-imgs">{images.map((src: string, i: number) => <div key={i} className="rs-modal-gallery-img-item"><img src={src} alt="Property" /></div>)}</div>
        </div>

        <div className="rs-mobile-media">
          <MobileCarousel images={images} ytId={ytId} />
        </div>

        <div className="rs-modal-info">
          <div className="rs-modal-body">
            <div className="rs-modal-district">D{property.DISTRICT} · {property.AREA}</div>
            <div className="rs-modal-title">{property.HEADER_TITLE}</div>
            <div className="rs-modal-price-row">
              <div className="rs-modal-price">{property.SELLING_PRICE || "Price on request"}</div>
              <button className={`rs-modal-copy-btn ${copied ? "copied" : ""}`} onClick={handleCopyLink}><LinkIcon /> {copied ? "Link Copied!" : "Copy Link"}</button>
              <a className="rs-modal-wa-btn" href={`https://wa.me/${WHATSAPP_NO}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"><WAIcon size={16} /> Contact Emily</a>
            </div>
            <div className="rs-modal-divider" />
            <div className="rs-modal-ov-grid">
              <div className="rs-modal-ov-item"><span className="rs-modal-ov-label">Type</span><span className="rs-modal-ov-value">{property.PROPERTY_TYPE}</span></div>
              <div className="rs-modal-ov-item"><span className="rs-modal-ov-label">Land</span><span className="rs-modal-ov-value">{property.LANDSIZE_SQFT} sqft</span></div>
              <div className="rs-modal-ov-item"><span className="rs-modal-ov-label">Rooms</span><span className="rs-modal-ov-value">{property.ROOMS}</span></div>
              <div className="rs-modal-ov-item"><span className="rs-modal-ov-label">Tenure</span><span className="rs-modal-ov-value">{property.TENURE}</span></div>
            </div>
            {property.DESCRIPTION && <><div className="rs-modal-divider" /><div className="rs-modal-desc">{stripHtml(property.DESCRIPTION)}</div></>}
            <div className="rs-modal-divider" />
            <div className="rs-modal-agent">
              <img src={AGENT_PHOTO} alt="Emily Ho" className="rs-modal-agent-img" />
              <div>
                <div className="rs-modal-agent-name">Emily Ho</div>
                <div className="rs-modal-agent-role">Principal Consultant · Realstar Premier</div>
                <a className="rs-modal-call-btn" href="tel:+6590069222"><PhoneIcon /> 90069222</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&display=swap");

  :root {
    --radius: 14px;
    --border: rgba(0,0,0,0.08);
    --muted: #e8e4de;
    --muted-fg: #8a8278;
    --primary: #0f0e0d;
    --gold: #b8892e;
    --gold-lt: #fdf5e4;
    --green: hsl(142 65% 26%);
    --green-hover: hsl(142 65% 19%);
    --card: #fff;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.04);
    --shadow-hover: 0 28px 64px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.12);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .rs-root {
    font-family: 'Google Sans Flex', sans-serif;
    background: #f0ede8;
    min-height: 100vh;
    color: #111;
  }

  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes modalIn { from{opacity:0;transform:translateY(32px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes modalOut { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(32px) scale(0.97)} }
  @keyframes backdropIn { from{opacity:0} to{opacity:1} }
  @keyframes backdropOut { from{opacity:1} to{opacity:0} }
  @keyframes floatAgentIn { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
  @keyframes floatAgentOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-18px)} }
  @keyframes shineMove { 0%{left:-90%} 60%{left:130%} 100%{left:130%} }
  @keyframes shimmer { 0%{background-position:-800px 0} 100%{background-position:800px 0} }
  @keyframes progressFlow {
    0% { background-position: 0% 0; }
    100% { background-position: 200% 0; }
  }

  /* Progress bar */
  .rs-progress-bar-wrap {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    height: 3px; background: rgba(184,137,46,0.15); pointer-events: none;
  }
  .rs-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #b8892e 0%, #e6b84a 40%, #b8892e 80%, #e6b84a 100%);
    background-size: 200% 100%;
    animation: progressFlow 1.2s linear infinite;
    transition: width 0.55s cubic-bezier(0.22,1,0.36,1);
    border-radius: 0 2px 2px 0;
  }

  /* Auth Gate */
  .rs-auth-backdrop {
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(12,10,8,0.82); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.35s ease both; overflow-y: auto;
  }
  .rs-auth-box {
    background: #1c1916; border: 1px solid rgba(184,137,46,0.22); border-radius: 22px;
    width: min(440px,100%);
    box-shadow: 0 40px 100px rgba(0,0,0,0.6);
    display: flex; flex-direction: column; align-items: stretch;
    animation: modalIn 0.38s cubic-bezier(0.22,1,0.36,1) both;
    position: relative; overflow: hidden;
  }
  .rs-auth-close {
    position: absolute; top: 14px; right: 14px; width: 34px; height: 34px;
    border-radius: 50%; border: none; background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.6); font-size: 0.95rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.18s, color 0.18s; z-index: 10;
  }
  .rs-auth-close:hover { background: rgba(255,255,255,0.16); color: #fff; }
  .rs-auth-header {
    padding: 32px 32px 20px; display: flex; flex-direction: column;
    align-items: center; text-align: center;
  }
  .rs-auth-logo { width: 62px; height: 62px; border-radius: 13px; object-fit: cover; object-position: top center; border: 2px solid rgba(184,137,46,0.45); margin-bottom: 14px; }
  .rs-auth-title { font-size: 1.3rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin-bottom: 6px; }
  .rs-auth-sub { font-size: 0.82rem; color: rgba(255,255,255,0.38); line-height: 1.55; }
  .rs-otp-form { padding: 0 28px 12px; }
  .rs-otp-step { display: none; }
  .rs-otp-step.active { display: block; }
  .rs-otp-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 6px; display: block; }
  .rs-otp-input {
    width: 100%; padding: 12px 14px;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px; color: #fff;
    font-family: 'Google Sans Flex', sans-serif; font-size: 1rem;
    outline: none; margin-bottom: 14px; transition: border-color 0.18s;
  }
  .rs-otp-input:focus { border-color: #b8892e; }
  .rs-otp-input::placeholder { color: rgba(255,255,255,0.22); }
  .rs-otp-phone-row { display: flex; gap: 8px; }
  .rs-otp-prefix { padding: 12px 12px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; color: rgba(255,255,255,0.5); font-size: 1rem; white-space: nowrap; flex-shrink: 0; margin-bottom: 14px; line-height: 1.4; display: flex; align-items: center; }
  .rs-otp-phone-row .rs-otp-input { flex: 1; }
  .rs-otp-btn { width: 100%; padding: 13px; background: #b8892e; color: #fff; border: none; border-radius: 10px; font-family: 'Google Sans Flex', sans-serif; font-size: 1rem; font-weight: 800; cursor: pointer; transition: opacity 0.18s; margin-top: 4px; }
  .rs-otp-btn:hover:not(:disabled) { opacity: 0.85; }
  .rs-otp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .rs-otp-back { background: none; border: none; color: rgba(255,255,255,0.35); font-size: 0.8rem; text-decoration: underline; margin-top: 12px; text-underline-offset: 3px; cursor: pointer; width: 100%; text-align: center; font-family: 'Google Sans Flex', sans-serif; display: block; padding: 4px 0; transition: color 0.18s; }
  .rs-otp-back:hover { color: rgba(255,255,255,0.65); }
  .rs-otp-digit-row { display: flex; gap: 8px; justify-content: center; margin-bottom: 14px; }
  .rs-otp-digit { width: 48px; height: 58px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; color: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 1.5rem; font-weight: 800; text-align: center; outline: none; transition: border-color 0.18s; }
  .rs-otp-digit:focus { border-color: #b8892e; }
  .rs-otp-msg { margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-size: 0.84rem; text-align: center; line-height: 1.4; }
  .rs-otp-msg.error { background: rgba(176,48,48,0.18); border: 1px solid rgba(176,48,48,0.3); color: #f08080; }
  .rs-otp-msg.success { background: rgba(34,197,94,0.14); border: 1px solid rgba(34,197,94,0.3); color: #86efac; }
  .rs-auth-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 0 0; }
  .rs-auth-admin-footer { padding: 14px 28px 18px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .rs-auth-admin-link { font-size: 0.7rem; color: rgba(255,255,255,0.18); cursor: pointer; background: none; border: none; font-family: 'Google Sans Flex', sans-serif; text-decoration: underline; text-underline-offset: 3px; transition: color 0.18s; padding: 2px; }
  .rs-auth-admin-link:hover { color: rgba(255,255,255,0.42); }
  .rs-admin-pin-row { display: flex; gap: 8px; justify-content: center; align-items: center; }
  .rs-admin-pin-input { width: 110px; padding: 10px 14px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; color: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 1rem; text-align: center; outline: none; letter-spacing: 0.3em; transition: border-color 0.18s; }
  .rs-admin-pin-input:focus { border-color: #b8892e; }
  .rs-admin-pin-btn { padding: 10px 16px; border-radius: 8px; border: none; background: rgba(255,255,255,0.1); color: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 0.84rem; font-weight: 700; cursor: pointer; transition: background 0.18s; }
  .rs-admin-pin-btn:hover { background: rgba(255,255,255,0.18); }

  /* Desktop Header */
  .rs-header { position: relative; height: 320px; overflow: hidden; }
  .rs-header-bg { position: absolute; inset: 0; background-image: url('https://edricteokf-resources.s3.ap-southeast-1.amazonaws.com/forms+headers/emilyho_formbanner_PLAIN.png'); background-size: cover; background-position: center 30%; }
  .rs-header-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 48%,rgba(0,0,0,0.55) 100%); }
  .rs-photo-wrap { position: absolute; left: 48px; top: 18px; bottom: 0; width: 290px; overflow: hidden; z-index: 2; }
  .rs-photo { width: 130%; height: 130%; object-fit: cover; object-position: top center; display: block; margin-left: -14%; }
  .rs-agent-info { position: absolute; bottom: 26px; left: 366px; z-index: 4; display: flex; flex-direction: column; gap: 2px; }
  .rs-agency-label { font-size: 0.88rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,0.7); }
  .rs-agent-name { font-size: 3.4rem; font-weight: 800; letter-spacing: -0.025em; color: #fff; text-shadow: 0 3px 20px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.5); line-height: 1.05; }
  .rs-agent-phone { font-size: 1.7rem; font-weight: 1000; color: rgba(255,255,255,0.75); letter-spacing: 0.03em; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
  .rs-agent-rank {
    font-size: 1rem;
    font-style: italic;
    letter-spacing: 0.05em;
    color: #FFD700;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(184,137,46,0.4);
    margin-top: 1px;
    font-weight: 700;
  }
  .rs-header-wa { margin-top: 14px; display: inline-flex; align-items: center; gap: 7px; padding: 9px 20px; border-radius: 9px; border: none; background: var(--green); color: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 0.86rem; font-weight: 700; cursor: pointer; text-decoration: none; box-shadow: 0 4px 18px rgba(0,0,0,0.32); transition: background 0.18s, transform 0.15s; width: fit-content; }
  .rs-header-wa:hover { background: var(--green-hover); transform: scale(1.03); }
  .rs-header-title {
    position: absolute;
    right: 48px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 3;
    text-align: right;
    max-width: 450px;
  }
  .rs-header-title h1 {
    font-size: clamp(1.5rem, 3.5vw, 3.4rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    color: #fff;
    text-shadow: 0 3px 28px rgba(0,0,0,0.55);
    white-space: normal;
    line-height: 1.1;
  }

  @media (max-width: 1250px) {
    .rs-header-title h1 { font-size: 2.2rem; }
    .rs-header-title { max-width: calc(100% - 700px); }
  }
  @media (max-width: 1100px) {
    .rs-header-title { display: none; }
  }

  /* Mobile Header */
  .rs-mobile-header { display: none; }
  .rs-mobile-page-title { display: none; }

  /* Toolbar */
  .rs-sticky { position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.28); }
  .rs-bar { background: #1c1a17; padding: 0 48px; display: flex; align-items: center; gap: 16px; height: 68px; }
  .rs-bar-label { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.38); }
  .rs-sort-select { padding: 9px 14px; font-family: 'Google Sans Flex', sans-serif; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; background: rgba(255,255,255,0.07); color: #fff; cursor: pointer; outline: none; transition: border-color 0.18s; appearance: none; }
  .rs-sort-select option { background: #1c1a17; color: #fff; }
  .rs-sort-select:focus { border-color: var(--gold); }
  .rs-search-wrap { position: relative; display: flex; align-items: center; }
  .rs-search-icon { position: absolute; left: 12px; pointer-events: none; color: rgba(255,255,255,0.38); }
  .rs-search { padding: 9px 14px 9px 38px; font-family: 'Google Sans Flex', sans-serif; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; background: rgba(255,255,255,0.07); color: #fff; outline: none; width: 248px; transition: border-color 0.18s, width 0.25s; }
  .rs-search::placeholder { color: rgba(255,255,255,0.32); }
  .rs-search:focus { border-color: var(--gold); width: 310px; }
  .rs-bar-title { margin-left: auto; font-size: 0.88rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(255,255,255,0.38); white-space: nowrap; }
  .rs-bar-agent { display: flex; align-items: center; gap: 12px; opacity: 0; pointer-events: none; flex-shrink: 0; }
  .rs-bar-agent.visible { opacity: 1; pointer-events: auto; animation: floatAgentIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .rs-bar-agent.hidden { opacity: 0; animation: floatAgentOut 0.3s ease both; }
  .rs-bar-agent-img { width: 44px; height: 44px; border-radius: 9px; object-fit: cover; object-position: top center; border: 2px solid rgba(184,137,46,0.7); flex-shrink: 0; }
  .rs-bar-agent-text { display: flex; flex-direction: column; gap: 2px; }
  .rs-bar-agent-name { font-size: 0.98rem; font-weight: 800; color: #fff; letter-spacing: -0.01em; line-height: 1; }
  .rs-bar-agent-role { font-size: 0.68rem; color: #FFD700; font-style: italic; letter-spacing: 0.04em; font-weight: 700; text-shadow: 0 0 8px rgba(184,137,46,0.3); }
  .rs-bar-agent-divider { width: 1px; height: 34px; background: rgba(255,255,255,0.15); margin: 0 4px; flex-shrink: 0; }

  /* Grid & Cards */
  .rs-container { max-width: 1600px; margin: 0 auto; padding: 32px 48px 80px; }
  .rs-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 22px; }
  .rs-card { width: 100%; background: var(--card); border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; opacity: 0; transform: translateY(18px); cursor: pointer; position: relative; transition: box-shadow 0.5s cubic-bezier(0.22,1,0.36,1), border-color 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1); text-decoration: none; color: #000; }
  .rs-card.visible { animation: fadeUp 0.46s cubic-bezier(0.22,1,0.36,1) forwards; }
  .rs-card:hover { box-shadow: var(--shadow-hover), 0 0 0 1.5px rgba(184,137,46,0.5), 0 0 28px rgba(184,137,46,0.2), 0 0 60px rgba(184,137,46,0.09); border-color: rgba(184,137,46,0.5); transform: scale(1.026) translateY(-5px); }
  .rs-card::before { content: ''; position: absolute; top: 0; bottom: 0; width: 70px; background: linear-gradient(108deg,transparent 0%,rgba(255,255,255,0) 28%,rgba(255,255,255,0.44) 50%,rgba(255,255,255,0) 72%,transparent 100%); left: -90%; z-index: 10; pointer-events: none; }
  .rs-card:hover::before { animation: shineMove 0.9s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }

  .rs-img-zone { position: relative; height: 200px; overflow: hidden; background: var(--muted); flex-shrink: 0; }
  .rs-img-zone img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 1.1s cubic-bezier(0.25,0.46,0.45,0.94); }
  .rs-card:hover .rs-img-zone img { transform: scale(1.06); }
  .rs-img-hover-overlay { position: absolute; inset: 0; background: linear-gradient(to top,rgba(0,0,0,0.58) 0%,rgba(0,0,0,0.15) 45%,transparent 100%); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 32px; opacity: 0; transition: opacity 0.5s ease; z-index: 3; }
  .rs-card:hover .rs-img-hover-overlay { opacity: 1; }
  .rs-img-hover-text { font-size: 0.8rem; font-weight: 700; color: #fff; letter-spacing: 0.1em; padding: 6px 18px; border: 1px solid rgba(255,255,255,0.5); border-radius: 20px; backdrop-filter: blur(3px); text-shadow: 0 1px 6px rgba(0,0,0,0.35); }
  .rs-img-watermark { position: absolute; bottom: 7px; right: 10px; z-index: 4; font-size: 1.05rem; font-weight: 700; color: rgba(255,255,255,0.88); text-shadow: 0 1px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7); letter-spacing: 0.03em; pointer-events: none; }
  .rs-no-img { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted-fg); font-size: 0.78rem; }
  .rs-type-badge { position: absolute; top: 10px; left: 10px; z-index: 2; background: var(--gold); color: #fff; font-size: 0.55rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; }
  .rs-tenure-badge { position: absolute; top: 10px; right: 10px; z-index: 2; background: rgba(6,6,16,0.68); backdrop-filter: blur(6px); color: #fff; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }

  .rs-card-body { padding: 14px 15px 10px; flex: 1; display: flex; flex-direction: column; gap: 7px; }
  .rs-card-district { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--gold); }
  .rs-card-title { font-size: 0.84rem; font-weight: 700; color: #000; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .rs-price { font-size: 1.1rem; font-weight: 800; color: #000; letter-spacing: -0.03em; }
  .rs-stats { display: flex; gap: 10px; font-size: 0.69rem; color: var(--muted-fg); }
  .rs-stat { display: flex; align-items: center; gap: 3px; }
  .rs-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .rs-chip { font-size: 0.6rem; font-weight: 600; padding: 2px 7px; border-radius: 5px; background: var(--muted); color: var(--muted-fg); }
  .rs-chip-gold { background: var(--gold-lt); color: #7a5a18; }
  .rs-card-footer { padding: 10px 15px; border-top: 1px solid var(--border); }
  .rs-view-hint { font-size: 0.72rem; font-weight: 600; color: #aaa; display: flex; align-items: center; justify-content: center; gap: 6px; transition: color 0.18s; }
  .rs-card:hover .rs-view-hint { color: var(--gold); }
  .rs-arrow { transition: transform 0.2s; }
  .rs-card:hover .rs-arrow { transform: translateX(4px); }

  /* Pagination */
  .rs-pagination { display: flex; justify-content: center; gap: 5px; margin-top: 44px; flex-wrap: wrap; }
  .rs-page-btn { padding: 7px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 0.78rem; color: var(--primary); cursor: pointer; transition: all 0.18s; }
  .rs-page-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
  .rs-page-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }
  .rs-page-btn:disabled { opacity: 0.26; cursor: not-allowed; }

  /* States */
  .rs-state-center { text-align: center; padding: 80px 0; width: 100%; }
  .rs-spinner { width: 38px; height: 38px; border: 3px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.72s linear infinite; margin: 0 auto 14px; }
  .rs-retry-btn { margin-top: 12px; padding: 8px 20px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-family: 'Google Sans Flex', sans-serif; font-weight: 600; cursor: pointer; }

  /* Property Detail View (Modal) */
  .rs-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(12,10,8,0.85);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    overflow-y: auto;
    animation: backdropIn 0.3s ease both;
  }
  .rs-modal {
    width: min(1200px, 100%);
    background: #1a1816;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    position: relative;
    box-shadow: 0 40px 120px rgba(0,0,0,0.7);
    animation: modalIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
    max-height: 90vh;
  }
  .rs-modal-gallery { width: 52%; flex-shrink: 0; background: #111; overflow-y: auto; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.06); max-height: 100vh; }
  .rs-modal-gallery-video { position: relative; width: 100%; padding-top: 56.25%; flex-shrink: 0; }
  .rs-modal-gallery-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }
  .rs-modal-gallery-imgs { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  .rs-modal-gallery-img-item { position: relative; width: 100%; overflow: hidden; flex-shrink: 0; aspect-ratio: 16/9; }
  .rs-modal-gallery-img-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .rs-modal-info { flex: 1; overflow-y: auto; max-height: 100vh; }
  .rs-modal-close { position: absolute; top: 14px; right: 14px; z-index: 20; width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); color: #fff; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.18s; }
  .rs-modal-close:hover { background: rgba(0,0,0,0.8); }
  .rs-modal-body { padding: 32px 30px 40px; }
  .rs-modal-district { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
  .rs-modal-title { font-size: 1.25rem; font-weight: 800; color: #fff; line-height: 1.35; margin-bottom: 20px; text-transform: uppercase; }
  .rs-modal-price-row { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
  .rs-modal-price { font-size: 2.2rem; font-weight: 800; color: #fff; letter-spacing: -0.04em; line-height: 1; margin-bottom: 4px; }
  .rs-modal-wa-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: 10px; border: none; background: var(--green); color: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 0.95rem; font-weight: 700; cursor: pointer; text-decoration: none; box-shadow: 0 4px 16px rgba(0,0,0,0.28); transition: background 0.18s, transform 0.15s; white-space: nowrap; width: 100%; }
  .rs-modal-wa-btn:hover { background: var(--green-hover); transform: scale(1.02); }
  .rs-modal-copy-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.85); font-family: 'Google Sans Flex', sans-serif; font-size: 0.9rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.18s, transform 0.15s, border-color 0.18s; width: 100%; }
  .rs-modal-copy-btn:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.3); transform: scale(1.03); }
  .rs-modal-copy-btn.copied { background: rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.45); color: rgb(134,239,172); }
  .rs-modal-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 20px 0; }
  .rs-modal-ov-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
  .rs-modal-ov-item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
  .rs-modal-ov-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.4); }
  .rs-modal-ov-value { font-size: 0.92rem; font-weight: 600; color: #fff; }
  .rs-modal-desc { font-size: 0.88rem; color: rgba(255,255,255,0.52); line-height: 1.72; white-space: pre-line; }
  .rs-modal-agent { margin-top: 4px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; padding: 18px; display: flex; align-items: center; gap: 16px; }
  .rs-modal-agent-img { width: 66px; height: 66px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 2px solid rgba(184,137,46,0.5); }
  .rs-modal-agent-name { font-size: 1rem; font-weight: 800; color: #fff; margin-bottom: 2px; }
  .rs-modal-agent-role { font-size: 0.72rem; color: #FFD700; font-style: italic; margin-bottom: 10px; font-weight: 700; text-shadow: 0 0 8px rgba(184,137,46,0.3); }
  .rs-modal-call-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none; background: rgba(255,255,255,0.12); color: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-decoration: none; transition: background 0.18s, transform 0.15s; }
  .rs-modal-call-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.03); }

  /* Mobile Carousel */
  .rs-mobile-media { display: none; }
  .rs-carousel-wrap { position: relative; width: 100%; background: #000; }
  .rs-carousel-slide { width: 100%; overflow: hidden; }
  .rs-carousel-item-video { position: relative; padding-top: 56.25%; }
  .rs-carousel-item-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }
  .rs-carousel-item-photo { position: relative; aspect-ratio: 4/3; }
  .rs-carousel-item-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .rs-carousel-wm { position: absolute; bottom: 8px; right: 10px; z-index: 3; font-size: 0.88rem; font-weight: 700; color: rgba(255,255,255,0.82); text-shadow: 0 1px 6px rgba(0,0,0,0.85); pointer-events: none; }
  .rs-carousel-video-label { position: absolute; top: 10px; left: 10px; z-index: 5; font-size: 0.58rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #fff; background: rgba(184,137,46,0.9); padding: 3px 9px; border-radius: 4px; }
  .rs-carousel-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 6; width: 36px; height: 36px; border-radius: 50%; border: none; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); color: #fff; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.18s; }
  .rs-carousel-nav:hover { background: rgba(0,0,0,0.8); }
  .rs-carousel-nav.prev { left: 10px; }
  .rs-carousel-nav.next { right: 10px; }
  .rs-carousel-dots { display: flex; gap: 5px; justify-content: center; padding: 10px 0; background: #111; }
  .rs-carousel-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.3); border: none; cursor: pointer; padding: 0; transition: background 0.18s, transform 0.18s; }
  .rs-carousel-dot.active { background: #fff; transform: scale(1.3); }
  .rs-carousel-counter { text-align: center; font-size: 0.65rem; font-weight: 600; color: rgba(255,255,255,0.3); background: #111; padding-bottom: 8px; letter-spacing: 0.06em; }

  /* Responsive */
  @media (max-width: 1200px) { .rs-grid { grid-template-columns: repeat(3,1fr); } }
  @media (max-width: 900px)  { .rs-grid { grid-template-columns: repeat(2,1fr); gap: 16px; } .rs-container { padding-left: 24px; padding-right: 24px; } }
  @media (max-width: 640px) {
    .rs-header { display: none; }
    .rs-mobile-header {
      display: flex; flex-direction: row; align-items: flex-end;
      background: #1a1714; position: relative; overflow: hidden;
      min-height: 230px;
    }
    .rs-mobile-header::before {
      content: ''; position: absolute; inset: 0;
      background-image: url('https://edricteokf-resources.s3.ap-southeast-1.amazonaws.com/forms+headers/emilyho_formbanner_PLAIN.png');
      background-size: cover; background-position: center 30%; opacity: 0.35;
    }
    .rs-mobile-header::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%);
    }
    .rs-mobile-photo-wrap {
      position: relative; z-index: 2; flex-shrink: 0;
      width: 155px; align-self: flex-end; overflow: hidden;
    }
    .rs-mobile-photo-wrap img {
      width: 140%; height: auto; min-height: 225px;
      object-fit: cover; object-position: center top;
      display: block; margin-left: -5%;
    }
    .rs-mobile-content {
      position: relative; z-index: 2; flex: 1;
      display: flex; flex-direction: column; align-items: flex-end;
      padding: 20px 18px 18px 8px; gap: 2px;
    }
    .rs-mobile-agency { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.7); text-align: right; }
    .rs-mobile-name { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; color: #fff; line-height: 1.05; text-align: right; text-shadow: 0 2px 16px rgba(0,0,0,0.6); }
    .rs-mobile-phone { font-size: 1.7rem; font-weight: 1000; color: rgba(255,255,255,0.75); text-align: right; }
    .rs-mobile-rank {
      font-size: 0.78rem;
      font-style: italic;
      color: #FFD700;
      text-align: right;
      margin-bottom: 10px;
      font-weight: 700;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(184,137,46,0.3);
    }
    .rs-mobile-wa { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 9px; border: none; background: var(--green); color: #fff; font-family: 'Google Sans Flex', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; text-decoration: none; box-shadow: 0 4px 18px rgba(0,0,0,0.32); transition: background 0.18s, transform 0.15s; }
    .rs-mobile-page-title {
      display: block;
      background: #1c1a17; padding: 12px 18px; font-size: 0.9rem; font-weight: 800; color: #fff;
      text-align: center; width: 100%; letter-spacing: 0.04em;
      border-bottom: 2px solid rgba(184,137,46,0.4);
    }

    .rs-bar { padding: 10px 16px; gap: 10px; height: auto; flex-wrap: wrap; }
    .rs-bar-agent, .rs-bar-title { display: none; }
    .rs-search { width: 150px; }
    .rs-search:focus { width: 190px; }
    .rs-container { padding: 20px 16px 60px; }
    .rs-grid { grid-template-columns: 1fr; gap: 14px; }

    .rs-modal-backdrop { padding: 0; align-items: flex-start; }
    .rs-modal { flex-direction: column; border-radius: 0; width: 100%; min-height: 100vh; max-height: none; overflow: visible; align-self: auto; margin: 0; }
    .rs-modal-gallery { display: none; }
    .rs-mobile-media { display: block; width: 100%; flex-shrink: 0; }
    .rs-modal-info { max-height: none; overflow: visible; }
    .rs-modal-price-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  }
`;

function AppContent() {
  const [allGcb, setAllGcb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_LISTINGS}?page=1&pagesize=500`);
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      const gcbs = (json.data || []).filter((p: any) => {
        const type = (p.PROPERTY_TYPE || "").trim();
        return type === "Good Class Bungalow" || type.toLowerCase().includes("bungalow");
      });
      setAllGcb(gcbs);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Manual fix for robots tag in case Helmet is not overriding Softr's defaults
  useEffect(() => {
    const fixRobots = () => {
      // 1. Find and remove ALL existing robots tags to prevent conflicts
      const existingTags = document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]');
      existingTags.forEach(tag => tag.remove());

      // 2. Create a single fresh tag
      const newTag = document.createElement('meta');
      newTag.name = "robots";
      newTag.content = "index, follow";

      // 3. Insert it at the very beginning of the head for maximum priority
      if (document.head.firstChild) {
        document.head.insertBefore(newTag, document.head.firstChild);
      } else {
        document.head.appendChild(newTag);
      }
    };

    // Run immediately
    fixRobots();

    // Run periodically to catch dynamic injections from the hosting platform
    const interval = setInterval(fixRobots, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="rs-root">
      <HomePage allGcb={allGcb} loading={loading} error={error} loadAll={loadAll} />
      <Routes>
        <Route path="/" element={null} />
        <Route path="/property/:id" element={<PropertyPage allGcb={allGcb} loading={loading} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <AppContent />
    </>
  );
}
