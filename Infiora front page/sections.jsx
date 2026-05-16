// Page section components for the Infiora landing page.
// All copy goes through `t(key)` so EN↔HR switch is instant.
const { useState: useStateS, useRef: useRefS, useEffect: useEffectS } = React;

/* ---------- shared bits ---------- */

function Eyebrow({ children }) {
  return <div className="eyebrow"><span className="eyebrow-dot" />{children}</div>;
}

function SectionHeader({ eyebrow, title, body, align = "left" }) {
  return (
    <div className={`sec-head sec-head--${align}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="sec-title">{title}</h2>
      {body && <p className="sec-body">{body}</p>}
    </div>
  );
}

/* ---------- Hero ---------- */

function Hero({ t, lang, onCta, onDemo, onSecondary }) {
  return (
    <section className="hero" id="top">
      <div className="hero-bg">
        <div className="hero-bg-grain" />
      </div>
      <div className="container hero-inner">
        <div className="hero-left">
          <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
          <h1 className="hero-title">
            <span className="hero-title-line">{t("hero.title.1")}</span>
            <span className="hero-title-line hero-title-em">{t("hero.title.2")}</span>
          </h1>
          <p className="hero-sub">{t("hero.subtitle")}</p>

          <div className="hero-cta-row">
            <button className="btn btn-primary" onClick={onCta}>
              {t("hero.ctaPrimary")}
              <span className="btn-arrow">→</span>
            </button>
            <a className="btn btn-ghost" href="https://infiora.hr/demo" target="_blank" rel="noopener">
              <span className="btn-live-dot" />
              {t("hero.ctaSecondary")}
            </a>
          </div>

          <div className="hero-proof">
            <span className="hero-proof-item">{t("hero.proofA")}</span>
            <span className="hero-proof-sep" />
            <span className="hero-proof-item">{t("hero.proofB")}</span>
            <span className="hero-proof-sep" />
            <span className="hero-proof-item">{t("hero.proofC")}</span>
          </div>
        </div>

        <div className="hero-right">
          <DashboardPreview t={t} lang={lang} />
        </div>
      </div>
    </section>
  );
}

/* ---------- Logo bar / soft trust ---------- */

function SoftTrustBar({ t }) {
  const tags = [
    t("hero.proofA"),
    t("hero.proofB"),
    t("hero.proofC"),
  ];
  return null; // hidden — proof row in hero suffices
}

/* ---------- Problem ---------- */

function Problem({ t }) {
  const items = [0, 1, 2, 3];
  return (
    <section className="section section--paper" id="problem">
      <div className="container">
        <SectionHeader
          eyebrow={t("problem.eyebrow")}
          title={t("problem.title")}
          align="left"
        />
        <div className="problem-grid">
          {items.map((i) => (
            <div className="problem-card" key={i}>
              <div className="problem-card-num">0{i + 1}</div>
              <div className="problem-card-title">{t(`problem.bullets.${i}.title`)}</div>
              <div className="problem-card-body">{t(`problem.bullets.${i}.body`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Solution ---------- */

function Solution({ t }) {
  const points = [0, 1, 2, 3];
  return (
    <section className="section section--ink" id="solution">
      <div className="container solution-inner">
        <div className="solution-left">
          <SectionHeader
            eyebrow={t("solution.eyebrow")}
            title={t("solution.title")}
            align="left"
          />
          <p className="solution-body">{t("solution.body")}</p>
        </div>
        <ul className="solution-points">
          {points.map((i) => (
            <li className="solution-point" key={i}>
              <span className="solution-point-mark">→</span>
              <span>{t(`solution.point.${i}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Features ---------- */

const FEATURE_KEYS = [
  "guide", "lang", "map", "requests",
  "feedback", "surveys", "popup", "orders",
  "brand", "analytics", "multi", "offline",
];

const FEATURE_GLYPHS = {
  guide: "guide", lang: "lang", map: "map", requests: "requests",
  feedback: "feedback", surveys: "surveys", popup: "popup", orders: "orders",
  brand: "brand", analytics: "analytics", multi: "multi", offline: "offline",
};

function FeatureGlyph({ kind }) {
  // Tiny diagrammatic SVG icons — original, geometric only.
  const common = { width: 32, height: 32, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (kind) {
    case "guide":
      return (<svg {...common}><rect x="7" y="5" width="18" height="22" rx="2" /><path d="M11 11h10M11 16h10M11 21h6" /></svg>);
    case "lang":
      return (<svg {...common}><circle cx="16" cy="16" r="10" /><path d="M6 16h20M16 6c3 3 3 17 0 20M16 6c-3 3-3 17 0 20" /></svg>);
    case "map":
      return (<svg {...common}><path d="M11 6L6 8v18l5-2 10 4 5-2V8l-5 2-10-4z" /><path d="M11 6v20M21 10v20" /></svg>);
    case "requests":
      return (<svg {...common}><path d="M6 10h20l-2 14H8L6 10z" /><path d="M11 10V7a5 5 0 0110 0v3" /></svg>);
    case "feedback":
      return (<svg {...common}><path d="M6 8h20v14H14l-6 5v-5H6V8z" /><path d="M11 14h10M11 18h6" /></svg>);
    case "surveys":
      return (<svg {...common}><rect x="6" y="6" width="20" height="20" rx="2" /><path d="M11 13l3 3 7-7" /><path d="M11 21h10" /></svg>);
    case "popup":
      return (<svg {...common}><rect x="5" y="9" width="22" height="14" rx="2" /><circle cx="11" cy="16" r="1.5" /><path d="M16 14l8-6M24 8h-4M24 8v4" /></svg>);
    case "orders":
      return (<svg {...common}><path d="M6 9h3l3 14h12l3-10H9" /><circle cx="13" cy="27" r="1.5" /><circle cx="22" cy="27" r="1.5" /></svg>);
    case "brand":
      return (<svg {...common}><circle cx="11" cy="11" r="5" /><circle cx="21" cy="21" r="5" /><circle cx="21" cy="11" r="5" /></svg>);
    case "analytics":
      return (<svg {...common}><path d="M6 24V6M6 24h20" /><path d="M11 24v-8M16 24v-13M21 24v-5M26 24v-10" /></svg>);
    case "multi":
      return (<svg {...common}><rect x="5" y="5" width="9" height="9" rx="1.5" /><rect x="18" y="5" width="9" height="9" rx="1.5" /><rect x="5" y="18" width="9" height="9" rx="1.5" /><rect x="18" y="18" width="9" height="9" rx="1.5" /></svg>);
    case "offline":
      return (<svg {...common}><path d="M16 5v16M10 15l6 6 6-6" /><path d="M6 25h20" /></svg>);
    default: return null;
  }
}

function Features({ t }) {
  return (
    <section className="section section--paper" id="features">
      <div className="container">
        <SectionHeader
          eyebrow={t("features.eyebrow")}
          title={t("features.title")}
          body={t("features.subtitle")}
        />
        <div className="features-grid">
          {FEATURE_KEYS.map((k, i) => (
            <article className="feature-card" key={k} style={{ "--i": i }}>
              <div className="feature-card-head">
                <div className="feature-glyph"><FeatureGlyph kind={FEATURE_GLYPHS[k]} /></div>
                <div className="feature-tag">{t(`features.items.${k}.tag`)}</div>
              </div>
              <h3 className="feature-title">{t(`features.items.${k}.title`)}</h3>
              <p className="feature-body">{t(`features.items.${k}.body`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Built for ---------- */

function BuiltFor({ t }) {
  const tabs = ["hotels", "apartments", "villas"];
  const [active, setActive] = useStateS("hotels");

  return (
    <section className="section section--cream" id="built-for">
      <div className="container">
        <SectionHeader
          eyebrow={t("builtFor.eyebrow")}
          title={t("builtFor.title")}
        />
        <div className="bf-tabs" role="tablist">
          {tabs.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={active === k}
              className={`bf-tab ${active === k ? "is-active" : ""}`}
              onClick={() => setActive(k)}
            >
              {t(`builtFor.tabs.${k}`)}
            </button>
          ))}
        </div>

        <div className="bf-panel" key={active}>
          <div className="bf-panel-left">
            <p className="bf-lede">{t(`builtFor.${active}.lede`)}</p>
            <ul className="bf-points">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="bf-point">
                  <span className="bf-point-bullet" />
                  <span>{t(`builtFor.${active}.points.${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bf-panel-right">
            <BFIllustration kind={active} t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

function BFIllustration({ kind, t }) {
  if (kind === "hotels") {
    return (
      <div className="bf-illu bf-illu--hotels">
        <div className="bf-illu-label">{t("builtFor.tabs.hotels")}</div>
        <div className="bf-illu-grid">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="bf-cell" style={{ animationDelay: `${i * 25}ms` }}>
              <span className="bf-cell-n">{101 + i}</span>
            </div>
          ))}
        </div>
        <div className="bf-illu-caption">groups · templates · per-room overrides</div>
      </div>
    );
  }
  if (kind === "apartments") {
    return (
      <div className="bf-illu bf-illu--apartments">
        <div className="bf-illu-label">{t("builtFor.tabs.apartments")}</div>
        <div className="bf-units">
          {["A1", "A2", "B1", "B2", "C1", "C2"].map((k, i) => (
            <div key={k} className="bf-unit" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="bf-unit-name">{k}</div>
              <div className="bf-unit-bar"><span style={{ width: `${50 + ((i * 13) % 45)}%` }} /></div>
              <div className="bf-unit-meta">unit · QR · portal</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="bf-illu bf-illu--villas">
      <div className="bf-illu-label">{t("builtFor.tabs.villas")}</div>
      <div className="bf-villa">
        <div className="bf-villa-card">
          <div className="bf-villa-cover" />
          <div className="bf-villa-body">
            <div className="bf-villa-name">Villa Maris</div>
            <div className="bf-villa-meta">Hvar, HR · 6 BR · private beach</div>
            <div className="bf-villa-tags">
              <span>concierge</span><span>map</span><span>offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- How it works ---------- */

function HowItWorks({ t }) {
  const steps = [0, 1, 2, 3, 4];
  return (
    <section className="section section--paper" id="how">
      <div className="container">
        <SectionHeader
          eyebrow={t("how.eyebrow")}
          title={t("how.title")}
        />
        <ol className="how-steps">
          {steps.map((i) => (
            <li className="how-step" key={i}>
              <div className="how-step-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="how-step-line" aria-hidden="true" />
              <div className="how-step-card">
                <h3 className="how-step-title">{t(`how.steps.${i}.title`)}</h3>
                <p className="how-step-body">{t(`how.steps.${i}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Revenue / upsell ---------- */

function Revenue({ t }) {
  const items = [0, 1, 2, 3];
  const kpis = [0, 1, 2];
  return (
    <section className="section section--cream" id="revenue">
      <div className="container">
        <SectionHeader
          eyebrow={t("revenue.eyebrow")}
          title={t("revenue.title")}
          body={t("revenue.body")}
        />
        <div className="revenue-kpis">
          {kpis.map((i) => (
            <div className="revenue-kpi" key={i}>
              <div className="revenue-kpi-v">{t(`revenue.kpi.${i}.v`)}</div>
              <div className="revenue-kpi-k">{t(`revenue.kpi.${i}.k`)}</div>
              <div className="revenue-kpi-s">{t(`revenue.kpi.${i}.s`)}</div>
            </div>
          ))}
        </div>
        <div className="revenue-grid">
          {items.map((i) => (
            <div className="revenue-card" key={i}>
              <div className="revenue-card-icon">
                <RevenueGlyph kind={i} />
              </div>
              <div className="revenue-card-title">{t(`revenue.items.${i}.title`)}</div>
              <div className="revenue-card-body">{t(`revenue.items.${i}.body`)}</div>
            </div>
          ))}
        </div>
        <div className="revenue-note">
          <span className="revenue-note-mark">★</span>
          {t("revenue.note")}
        </div>
      </div>
    </section>
  );
}

function RevenueGlyph({ kind }) {
  const common = { width: 28, height: 28, viewBox: "0 0 28 28", fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (kind) {
    case 0: // tours — compass / route
      return (<svg {...common}><circle cx="14" cy="14" r="9" /><path d="M10 18l3-8 5 0-3 8z" /></svg>);
    case 1: // transfer — arrow road
      return (<svg {...common}><path d="M4 14h16M16 10l4 4-4 4" /><circle cx="6" cy="20" r="2" /><circle cx="6" cy="8" r="2" /></svg>);
    case 2: // ordering — tray
      return (<svg {...common}><path d="M5 11h18M7 11v10h14V11M11 11V7a3 3 0 016 0v4" /></svg>);
    case 3: // late check-out — clock
      return (<svg {...common}><circle cx="14" cy="14" r="9" /><path d="M14 8v6l4 3" /></svg>);
    default: return null;
  }
}

/* ---------- Materials ---------- */

function Materials({ t }) {
  const items = [0, 1, 2];
  const notes = [0, 1, 2];
  return (
    <section className="section section--paper" id="materials">
      <div className="container">
        <SectionHeader
          eyebrow={t("materials.eyebrow")}
          title={t("materials.title")}
          body={t("materials.body")}
        />
        <div className="materials-grid">
          {items.map((i) => (
            <article className="mat-card" key={i}>
              <div className="mat-card-vis">
                <MaterialMock kind={i} />
              </div>
              <div className="mat-card-body">
                <div className="mat-card-tag">{t(`materials.items.${i}.tag`)}</div>
                <div className="mat-card-title">{t(`materials.items.${i}.title`)}</div>
                <div className="mat-card-text">{t(`materials.items.${i}.body`)}</div>
              </div>
            </article>
          ))}
        </div>
        <ul className="mat-notes">
          {notes.map((i) => (
            <li key={i} className="mat-note">
              <span className="mat-note-mark">✓</span>
              {t(`materials.note.${i}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MaterialMock({ kind }) {
  // 0 = sticker (circle), 1 = printed card (rectangle), 2 = NFC PVC stand
  if (kind === 0) {
    return (
      <div className="mat-sticker">
        <div className="mat-sticker-logo">VILLA<br/>MARIS</div>
        <div className="mat-sticker-qr"><QRMini /></div>
        <div className="mat-sticker-room">Suite 204 · scan</div>
      </div>
    );
  }
  if (kind === 1) {
    return (
      <div className="mat-card-mock">
        <div className="mat-card-front">
          <div className="mat-card-logo">VILLA MARIS</div>
          <div className="mat-card-line" />
          <div className="mat-card-sub">Hvar · est. 1968</div>
        </div>
        <div className="mat-card-back">
          <div className="mat-card-back-qr"><QRMini /></div>
          <div className="mat-card-back-meta">Suite 204</div>
        </div>
      </div>
    );
  }
  return (
    <div className="mat-stand">
      <div className="mat-stand-top">
        <div className="mat-stand-logo">VILLA MARIS</div>
        <div className="mat-stand-nfc">
          <span className="mat-stand-tap">tap or scan</span>
          <QRMini />
          <span className="mat-stand-nfc-mark">))</span>
        </div>
        <div className="mat-stand-room">Suite 204</div>
      </div>
      <div className="mat-stand-base" />
    </div>
  );
}

function QRMini() {
  // Compact illustrative QR
  const seed = [
    "1111111010111111",
    "1000001011010000",
    "1011101010010111",
    "1011101001010111",
    "1011101000110111",
    "1000001011110000",
    "1111111010111111",
    "0000000011000000",
    "1101010110101101",
    "1010101101010110",
    "0110011101001100",
    "1001100010110011",
    "0000000011101010",
    "1111111010000101",
    "1000001001101100",
    "1011101010110110",
  ];
  const cells = [];
  for (let r = 0; r < seed.length; r++) {
    for (let c = 0; c < seed[r].length; c++) {
      if (seed[r][c] === "1") cells.push(<rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="currentColor" />);
    }
  }
  return <svg viewBox="0 0 16 16" className="mat-qr">{cells}</svg>;
}

/* ---------- Trust ---------- */

function Trust({ t }) {
  const pills = [0, 1, 2, 3, 4, 5];
  return (
    <section className="section section--cream" id="trust">
      <div className="container trust-inner">
        <div className="trust-head">
          <SectionHeader
            eyebrow={t("trust.eyebrow")}
            title={t("trust.title")}
            body={t("trust.body")}
          />
        </div>
        <div className="trust-pills">
          {pills.map((i) => (
            <span className="trust-pill" key={i}>
              <span className="trust-pill-mark">✓</span>
              {t(`trust.pills.${i}`)}
            </span>
          ))}
        </div>
        <div className="trust-partners">
          <div className="trust-partners-head">
            <div>
              <div className="trust-partners-title">{t("trust.partnersTitle")}</div>
              <div className="trust-partners-body">{t("trust.partnersBody")}</div>
            </div>
          </div>
          <div className="trust-partners-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="trust-partner-slot" key={i}>
                <div className="trust-partner-mono">{t("trust.partnersPlaceholder")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Quote form ---------- */

function QuoteForm({ t }) {
  const [data, setData] = useStateS({
    name: "", email: "", company: "", website: "",
    type: "", units: "", properties: "",
    goals: [], message: "",
  });
  const [errors, setErrors] = useStateS({});
  const [state, setState] = useStateS("idle"); // idle | submitting | success

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const toggleGoal = (g) => setData((d) => {
    const has = d.goals.includes(g);
    return { ...d, goals: has ? d.goals.filter((x) => x !== g) : [...d.goals, g] };
  });

  const validate = () => {
    const e = {};
    if (!data.name.trim()) e.name = true;
    if (!data.email.trim()) e.email = "required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "format";
    if (!data.company.trim()) e.company = true;
    if (!data.type) e.type = true;
    if (!data.units) e.units = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setState("submitting");
    setTimeout(() => setState("success"), 900);
  };

  const types = ["hotel", "boutique", "apartments", "villa", "mgmt"];
  const unitsOpts = [0, 1, 2, 3];
  const propOpts = [0, 1, 2, 3];
  const goalOpts = [0, 1, 2, 3, 4, 5];

  return (
    <section className="section section--ink" id="quote">
      <div className="container quote-inner">
        <div className="quote-left">
          <SectionHeader
            eyebrow={t("quote.eyebrow")}
            title={t("quote.title")}
            body={t("quote.body")}
          />
          <div className="quote-side-meta">
            <div className="quote-side-row"><span className="quote-side-k">→</span><span>{t("quote.fields.typeOpts.hotel")} · {t("quote.fields.typeOpts.boutique")}</span></div>
            <div className="quote-side-row"><span className="quote-side-k">→</span><span>{t("quote.fields.typeOpts.apartments")} · {t("quote.fields.typeOpts.villa")}</span></div>
            <div className="quote-side-row"><span className="quote-side-k">→</span><span>{t("quote.fields.typeOpts.mgmt")}</span></div>
          </div>
        </div>

        <div className="quote-right">
          {state === "success" ? (
            <div className="quote-success">
              <div className="quote-success-mark">✓</div>
              <h3 className="quote-success-title">{t("quote.successTitle")}</h3>
              <p className="quote-success-body">{t("quote.successBody")}</p>
            </div>
          ) : (
            <form className="quote-form" onSubmit={submit} noValidate>
              <div className="qf-row">
                <Field label={t("quote.fields.name")} error={errors.name && t("quote.errorRequired")}>
                  <input value={data.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
                </Field>
                <Field label={t("quote.fields.email")} error={errors.email && (errors.email === "format" ? t("quote.errorEmail") : t("quote.errorRequired"))}>
                  <input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                </Field>
              </div>
              <div className="qf-row">
                <Field label={t("quote.fields.company")} error={errors.company && t("quote.errorRequired")}>
                  <input value={data.company} onChange={(e) => set("company", e.target.value)} />
                </Field>
                <Field label={t("quote.fields.website")}>
                  <input placeholder="https://" value={data.website} onChange={(e) => set("website", e.target.value)} />
                </Field>
              </div>

              <Field label={t("quote.fields.type")} error={errors.type && t("quote.errorRequired")}>
                <div className="qf-chips">
                  {types.map((k) => (
                    <button type="button" key={k} className={`qf-chip ${data.type === k ? "is-on" : ""}`} onClick={() => set("type", k)}>
                      {t(`quote.fields.typeOpts.${k}`)}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="qf-row">
                <Field label={t("quote.fields.units")} error={errors.units && t("quote.errorRequired")}>
                  <div className="qf-chips">
                    {unitsOpts.map((i) => (
                      <button type="button" key={i} className={`qf-chip qf-chip--small ${data.units === String(i) ? "is-on" : ""}`} onClick={() => set("units", String(i))}>
                        {t(`quote.fields.unitsOpts.${i}`)}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={t("quote.fields.properties")}>
                  <div className="qf-chips">
                    {propOpts.map((i) => (
                      <button type="button" key={i} className={`qf-chip qf-chip--small ${data.properties === String(i) ? "is-on" : ""}`} onClick={() => set("properties", String(i))}>
                        {t(`quote.fields.propertiesOpts.${i}`)}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label={t("quote.fields.goals")}>
                <div className="qf-chips">
                  {goalOpts.map((i) => (
                    <button type="button" key={i} className={`qf-chip ${data.goals.includes(String(i)) ? "is-on" : ""}`} onClick={() => toggleGoal(String(i))}>
                      {t(`quote.fields.goalsOpts.${i}`)}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={t("quote.fields.message")}>
                <textarea rows="3" placeholder={t("quote.fields.messagePh")} value={data.message} onChange={(e) => set("message", e.target.value)} />
              </Field>

              <button type="submit" className="btn btn-primary qf-submit" disabled={state === "submitting"}>
                {state === "submitting" ? t("quote.submitting") : t("quote.submit")}
                {state !== "submitting" && <span className="btn-arrow">→</span>}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ label, error, children }) {
  return (
    <label className={`qf-field ${error ? "is-error" : ""}`}>
      <span className="qf-label">{label}</span>
      {children}
      {error && <span className="qf-error">{error}</span>}
    </label>
  );
}

/* ---------- FAQ ---------- */

function FAQ({ t }) {
  const items = [0, 1, 2, 3, 4, 5, 6, 7];
  const [open, setOpen] = useStateS(0);
  return (
    <section className="section section--paper" id="faq">
      <div className="container faq-inner">
        <SectionHeader
          eyebrow={t("faq.eyebrow")}
          title={t("faq.title")}
        />
        <div className="faq-list">
          {items.map((i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                <button
                  className="faq-q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span>{t(`faq.items.${i}.q`)}</span>
                  <span className="faq-mark">{isOpen ? "–" : "+"}</span>
                </button>
                {isOpen && <div className="faq-a">{t(`faq.items.${i}.a`)}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer({ t }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="brand">
            <span className="brand-mark"><BrandMark /></span>
            <span className="brand-name">Infiora</span>
          </div>
          <div className="footer-tag">{t("footer.tag")}</div>
          <div className="footer-copy">{t("footer.copy")}</div>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <div className="footer-col-title">{t("footer.product")}</div>
            <a href="#features">{t("nav.product")}</a>
            <a href="#built-for">{t("nav.builtFor")}</a>
            <a href="#how">{t("nav.howItWorks")}</a>
            <a href="#faq">{t("nav.faq")}</a>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">{t("footer.company")}</div>
            <a href="#quote">{t("footer.contact")}</a>
            <a href="#quote">{t("nav.cta")}</a>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">{t("footer.legal")}</div>
            <a href="#">{t("footer.terms")}</a>
            <a href="#">{t("footer.privacy")}</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© {new Date().getFullYear()} Infiora</span>
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Brand mark ---------- */

function BrandMark() {
  // Small geometric mark — a tight ring with a quiet bloom inside.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 6 C9 9 9 15 12 18 C15 15 15 9 12 6 Z" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="12" r="1.4" fill="var(--paper)" />
    </svg>
  );
}

/* ---------- Nav ---------- */

function Nav({ t, lang, setLang, onCta }) {
  const [scrolled, setScrolled] = useStateS(false);
  useEffectS(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container nav-inner">
        <a href="#top" className="brand">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand-name">Infiora</span>
        </a>
        <nav className="nav-links">
          <a href="#features">{t("nav.product")}</a>
          <a href="#built-for">{t("nav.builtFor")}</a>
          <a href="#how">{t("nav.howItWorks")}</a>
          <a href="#faq">{t("nav.faq")}</a>
        </nav>
        <div className="nav-right">
          <a className="nav-demo" href="https://infiora.hr/demo" target="_blank" rel="noopener">
            <span className="btn-live-dot" />{t("nav.demo")}
          </a>
          <div className="lang-switch" role="tablist" aria-label="Language">
            <button role="tab" aria-selected={lang === "en"} className={lang === "en" ? "is-on" : ""} onClick={() => setLang("en")}>EN</button>
            <span className="lang-sep">/</span>
            <button role="tab" aria-selected={lang === "hr"} className={lang === "hr" ? "is-on" : ""} onClick={() => setLang("hr")}>HR</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onCta}>{t("nav.cta")}<span className="btn-arrow">→</span></button>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, {
  Hero, Problem, Solution, Features, BuiltFor, HowItWorks, Trust, QuoteForm, FAQ, Footer, Nav, BrandMark,
  Revenue, Materials,
});
