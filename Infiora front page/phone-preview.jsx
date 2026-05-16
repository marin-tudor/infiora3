// Interactive in-room guest-portal preview that recreates Infiora's actual
// features: branded room, multi-language link list, map with POIs,
// housekeeping/maintenance requests, feedback survey.
const { useState, useEffect, useRef } = React;

function PhonePreview({ t, lang }) {
  const [tab, setTab] = useState("guide");
  const [requestSent, setRequestSent] = useState(null);
  const [pin, setPin] = useState(0);
  const [showSurvey, setShowSurvey] = useState(false);
  const [survey, setSurvey] = useState(0);

  // Auto-rotate map pin focus for ambient motion
  useEffect(() => {
    if (tab !== "map") return;
    const id = setInterval(() => setPin((p) => (p + 1) % 4), 1800);
    return () => clearInterval(id);
  }, [tab]);

  // Reset request status when changing tabs
  useEffect(() => {
    setRequestSent(null);
  }, [tab]);

  const links = [
    { key: "restaurant", icon: "🍷", k: "phone.link.restaurant" },
    { key: "spa", icon: "✦", k: "phone.link.spa" },
    { key: "pool", icon: "≋", k: "phone.link.pool" },
    { key: "concierge", icon: "✉", k: "phone.link.concierge" },
    { key: "wifi", icon: "⌁", k: "phone.link.wifi" },
    { key: "checkout", icon: "→", k: "phone.link.checkout" },
  ];

  const pins = [
    { x: 28, y: 38, k: "phone.map.pinBeach", color: "#0E5B49", icon: "≋" },
    { x: 62, y: 28, k: "phone.map.pinRestaurant", color: "#9A4A2A", icon: "🍷" },
    { x: 70, y: 62, k: "phone.map.pinSpa", color: "#5B4A86", icon: "✦" },
    { x: 38, y: 70, k: "phone.map.pinTaxi", color: "#2A4A6B", icon: "🚖" },
  ];

  return (
    <div className="phone-shell">
      <div className="phone-bezel">
        <div className="phone-notch" />
        <div className="phone-screen">
          {/* Status bar */}
          <div className="phone-status">
            <span>9:41</span>
            <div className="phone-status-icons">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="battery" />
            </div>
          </div>

          {/* Header — branded per room */}
          <div className="phone-header">
            <div className="phone-lang">
              <span className="phone-lang-flag">{lang === "hr" ? "🇭🇷" : "🇬🇧"}</span>
              <span className="phone-lang-code">{lang.toUpperCase()}</span>
              <span className="phone-lang-caret">▾</span>
            </div>
            <div className="phone-hotel">
              <div className="phone-hotel-name">{t("phone.hotelName")}</div>
              <div className="phone-hotel-room">{t("phone.roomNumber")} · {t("phone.welcome")}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="phone-tabs">
            {["guide", "map", "requests"].map((k) => (
              <button
                key={k}
                className={`phone-tab ${tab === k ? "is-active" : ""}`}
                onClick={() => setTab(k)}
              >
                {t(`phone.tabs.${k}`)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="phone-content">
            {tab === "guide" && (
              <div className="phone-guide">
                {links.map((l, i) => (
                  <button key={l.key} className="phone-link" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="phone-link-icon">{l.icon}</span>
                    <span className="phone-link-label">{t(l.k)}</span>
                    <span className="phone-link-chev">›</span>
                  </button>
                ))}

                <button className="phone-survey-prompt" onClick={() => setShowSurvey(true)}>
                  <span>{t("phone.surveyPrompt")}</span>
                  <span className="phone-stars">
                    {[1, 2, 3, 4, 5].map((n) => <span key={n}>★</span>)}
                  </span>
                </button>
              </div>
            )}

            {tab === "map" && (
              <div className="phone-map">
                <div className="phone-map-title">{t("phone.map.title")}</div>
                <div className="phone-map-canvas">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="phone-map-svg">
                    <defs>
                      <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                        <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(14,22,20,0.06)" strokeWidth="0.3" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="#EAE3D4" />
                    <rect width="100" height="100" fill="url(#grid)" />
                    {/* coastline */}
                    <path d="M0,55 Q20,48 35,55 T70,52 Q85,50 100,58 L100,100 L0,100 Z" fill="#C9D7DA" />
                    <path d="M0,55 Q20,48 35,55 T70,52 Q85,50 100,58" fill="none" stroke="#7E9598" strokeWidth="0.4" />
                    {/* roads */}
                    <path d="M10,15 Q45,30 95,20" stroke="#FFF" strokeWidth="1.2" fill="none" />
                    <path d="M5,80 Q40,70 95,82" stroke="#FFF" strokeWidth="1.2" fill="none" />
                    {/* hotel marker */}
                    <circle cx="50" cy="50" r="2.5" fill="#0F1612" />
                    <circle cx="50" cy="50" r="5" fill="none" stroke="#0F1612" strokeWidth="0.3" opacity="0.4" />
                  </svg>
                  {pins.map((p, i) => (
                    <div
                      key={i}
                      className={`phone-pin ${pin === i ? "is-focus" : ""}`}
                      style={{ left: `${p.x}%`, top: `${p.y}%`, "--marker-color": p.color }}
                    >
                      <span className="phone-pin-badge"><span className="phone-pin-icon">{p.icon}</span></span>
                    </div>
                  ))}
                  <div className="phone-pin-label" style={{ left: `${pins[pin].x}%`, top: `${pins[pin].y - 12}%` }}>
                    {t(pins[pin].k)}
                  </div>
                </div>
              </div>
            )}

            {tab === "requests" && (
              <div className="phone-requests">
                {requestSent ? (
                  <div className="phone-req-sent">
                    <div className="phone-req-check">✓</div>
                    <div className="phone-req-sent-title">{t("phone.requestSubmitted")}</div>
                    <div className="phone-req-sent-meta">{t(`phone.request.${requestSent}`)} · {t("phone.roomNumber")}</div>
                  </div>
                ) : (
                  ["housekeeping", "maintenance", "late"].map((k) => (
                    <button
                      key={k}
                      className="phone-req"
                      onClick={() => setRequestSent(k)}
                    >
                      <span className="phone-req-icon" data-k={k}>
                        {k === "housekeeping" ? "✦" : k === "maintenance" ? "⚒" : "⏱"}
                      </span>
                      <span className="phone-req-label">{t(`phone.request.${k}`)}</span>
                      <span className="phone-req-chev">›</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Mini survey overlay */}
          {showSurvey && (
            <div className="phone-survey-overlay" onClick={() => setShowSurvey(false)}>
              <div className="phone-survey-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="phone-survey-title">{t("phone.surveyPrompt")}</div>
                <div className="phone-survey-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={`phone-survey-star ${n <= survey ? "is-on" : ""}`}
                      onClick={() => setSurvey(n)}
                    >★</button>
                  ))}
                </div>
                <button className="phone-survey-close" onClick={() => { setShowSurvey(false); setSurvey(0); }}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR floats behind phone */}
      <div className="phone-qr">
        <QRGrid />
        <div className="phone-qr-hint">{t("phone.qrHint")}</div>
      </div>
    </div>
  );
}

function QRGrid() {
  // Stylised QR — not a real code, intentionally illustrative
  const cells = [];
  const seed = [
    "111111101011111111",
    "100000101101000001",
    "101110101001011101",
    "101110100101011101",
    "101110100011011101",
    "100000101111000001",
    "111111101011111111",
    "000000001100000000",
    "110101011010110101",
    "101010110101011010",
    "011001110100110011",
    "100110001011001100",
    "000000001110101011",
    "111111101000010101",
    "100000100110110011",
    "101110101011011010",
    "101110100101110101",
    "100000101110110010",
  ];
  for (let r = 0; r < seed.length; r++) {
    for (let c = 0; c < seed[r].length; c++) {
      if (seed[r][c] === "1") cells.push(<rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="currentColor" />);
    }
  }
  return (
    <svg viewBox="0 0 18 18" className="phone-qr-svg" aria-hidden="true">{cells}</svg>
  );
}

window.PhonePreview = PhonePreview;
