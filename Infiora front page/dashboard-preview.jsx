// Dashboard preview — recreates Infiora's real admin analytics view.
// Highlights row + 4 stat cards with sparklines + line chart (Views & Taps)
// + device-usage donut. All values are illustrative for marketing, but
// the shape and labels match the actual `HomeInsights.tsx` data source.
const { useState: useStateD, useEffect: useEffectD, useRef: useRefD } = React;

function DashboardPreview({ t, lang }) {
  // Tiny live-counter so the dashboard feels live
  const [live, setLive] = useStateD(127);
  useEffectD(() => {
    const id = setInterval(() => {
      setLive((v) => Math.max(98, Math.min(168, v + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.3 ? 2 : 1))));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  // Static-but-realistic stat values
  const stats = [
    { key: "visits",  title: t("dash.stats.visits"),  total: "24,318", change: 12.4, series: [12, 18, 15, 22, 28, 24, 31, 29, 34, 38, 36, 42] },
    { key: "time",    title: t("dash.stats.time"),    total: "3m 42s",  change: 8.1,  series: [3.1, 3.2, 3.0, 3.3, 3.4, 3.2, 3.5, 3.7, 3.6, 3.8, 3.7, 3.9] },
    { key: "taps",    title: t("dash.stats.taps"),    total: "8,940",   change: 16.2, series: [4, 6, 5, 8, 7, 11, 10, 13, 12, 16, 18, 21] },
    { key: "bounce",  title: t("dash.stats.bounce"),  total: "21.4%",   change: -3.8, series: [28, 26, 27, 25, 24, 25, 23, 22, 23, 22, 21, 21] },
  ];

  // Line-chart data — views + taps over 12 days
  const days = ["M","T","W","T","F","S","S","M","T","W","T","F"];
  const viewsSeries = [1240, 1380, 1190, 1620, 1850, 2110, 2240, 1980, 2080, 2360, 2480, 2620];
  const tapsSeries  = [320, 410, 360, 520, 610, 720, 760, 680, 720, 880, 940, 1010];

  // Device donut
  const devices = [
    { k: "iOS",     v: 58, c: "var(--accent-deep)" },
    { k: "Android", v: 34, c: "color-mix(in oklch, var(--accent) 60%, #fff 40%)" },
    { k: "Desktop", v: 8,  c: "color-mix(in oklch, var(--accent) 30%, #fff 70%)" },
  ];

  // Languages
  const langs = [
    { k: "English",    v: 42 },
    { k: "Hrvatski",   v: 18 },
    { k: "Deutsch",    v: 14 },
    { k: "Italiano",   v: 12 },
    { k: "Français",   v: 8 },
    { k: "Other",      v: 6 },
  ];

  return (
    <div className="dash">
      <div className="dash-window">
        {/* Window chrome */}
        <div className="dash-chrome">
          <div className="dash-traffic"><span /><span /><span /></div>
          <div className="dash-url">
            <span className="dash-url-lock">⌗</span>
            <span>app.infiora.hr / hotels / villa-maris / analytics</span>
          </div>
          <div className="dash-chrome-actions"><span /><span /><span /></div>
        </div>

        {/* Inner app: sidebar + content */}
        <div className="dash-body">
          <aside className="dash-side">
            <div className="dash-side-brand">
              <span className="brand-mark"><BrandMark /></span>
              <span>Infiora</span>
            </div>
            <div className="dash-side-section">{t("dash.nav.overview")}</div>
            <a className="dash-side-link is-active"><span>◇</span>{t("dash.nav.analytics")}</a>
            <a className="dash-side-link"><span>▢</span>{t("dash.nav.rooms")}</a>
            <a className="dash-side-link"><span>◯</span>{t("dash.nav.requests")}</a>
            <a className="dash-side-link"><span>★</span>{t("dash.nav.feedback")}</a>
            <a className="dash-side-link"><span>⌖</span>{t("dash.nav.orders")}</a>
            <div className="dash-side-section">{t("dash.nav.config")}</div>
            <a className="dash-side-link"><span>⌥</span>{t("dash.nav.groups")}</a>
            <a className="dash-side-link"><span>⚙</span>{t("dash.nav.settings")}</a>
          </aside>

          <div className="dash-main">
            {/* Top bar */}
            <div className="dash-topbar">
              <div className="dash-topbar-title">
                <div className="dash-topbar-eyebrow">{t("dash.eyebrow")}</div>
                <div className="dash-topbar-h">{t("dash.title")}</div>
              </div>
              <div className="dash-period">
                <button className="dash-period-btn is-on">7d</button>
                <button className="dash-period-btn">30d</button>
                <button className="dash-period-btn">90d</button>
              </div>
            </div>

            {/* Highlights row */}
            <div className="dash-highlights">
              <div className="dash-hi">
                <div className="dash-hi-label">{t("dash.hi.live")}</div>
                <div className="dash-hi-value">
                  <span className="dash-live-dot" />{live}
                </div>
              </div>
              <div className="dash-hi">
                <div className="dash-hi-label">{t("dash.hi.topHotel")}</div>
                <div className="dash-hi-value">Villa Maris</div>
              </div>
              <div className="dash-hi">
                <div className="dash-hi-label">{t("dash.hi.peak")}</div>
                <div className="dash-hi-value">19:00 – 21:00</div>
              </div>
              <div className="dash-hi">
                <div className="dash-hi-label">{t("dash.hi.upsell")}</div>
                <div className="dash-hi-value dash-hi-value--accent">€ 4,128</div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="dash-stats">
              {stats.map((s) => <DashStatCard key={s.key} s={s} t={t} />)}
            </div>

            {/* Chart row */}
            <div className="dash-row">
              <div className="dash-card dash-card--chart">
                <div className="dash-card-head">
                  <div>
                    <div className="dash-card-title">{t("dash.overTime")}</div>
                    <div className="dash-card-sub">{t("dash.overTimeSub")}</div>
                  </div>
                  <div className="dash-legend">
                    <span><span className="dot dot--ink" />{t("dash.views")}</span>
                    <span><span className="dot dot--accent" />{t("dash.taps")}</span>
                  </div>
                </div>
                <LineChart views={viewsSeries} taps={tapsSeries} days={days} />
              </div>

              <div className="dash-card dash-card--donut">
                <div className="dash-card-head">
                  <div className="dash-card-title">{t("dash.devices")}</div>
                </div>
                <DonutChart parts={devices} />
                <div className="dash-donut-legend">
                  {devices.map((d) => (
                    <div key={d.k} className="dash-donut-row">
                      <span className="dot" style={{ background: d.c }} />
                      <span className="dash-donut-k">{d.k}</span>
                      <span className="dash-donut-v">{d.v}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Language bars */}
            <div className="dash-card dash-card--langs">
              <div className="dash-card-head">
                <div className="dash-card-title">{t("dash.languages")}</div>
                <div className="dash-card-sub">{t("dash.languagesSub")}</div>
              </div>
              <div className="dash-langs">
                {langs.map((l) => (
                  <div key={l.k} className="dash-lang">
                    <div className="dash-lang-row">
                      <span className="dash-lang-k">{l.k}</span>
                      <span className="dash-lang-v">{l.v}%</span>
                    </div>
                    <div className="dash-lang-bar"><span style={{ width: `${l.v * 2}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating phone overlay — the guest side */}
      <div className="dash-phone">
        <DashPhoneMini t={t} lang={lang} />
      </div>
    </div>
  );
}

function DashStatCard({ s, t }) {
  const pos = s.change > 0;
  // Build smooth path for sparkline
  const w = 100, h = 30;
  const min = Math.min(...s.series), max = Math.max(...s.series);
  const norm = (v) => h - ((v - min) / Math.max(0.0001, (max - min))) * (h - 4) - 2;
  const step = w / (s.series.length - 1);
  const d = s.series.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${norm(v).toFixed(1)}`).join(" ");
  const dArea = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <div className="dash-stat">
      <div className="dash-stat-title">{s.title}</div>
      <div className="dash-stat-row">
        <div className="dash-stat-total">{s.total}</div>
        <div className={`dash-stat-change ${pos ? "is-pos" : "is-neg"}`}>{pos ? "▲" : "▼"} {Math.abs(s.change)}%</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="dash-stat-spark" aria-hidden="true">
        <path d={dArea} fill="var(--accent-soft)" />
        <path d={d} fill="none" stroke="var(--accent-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function LineChart({ views, taps, days }) {
  const w = 480, h = 180, padL = 8, padR = 8, padT = 12, padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const all = [...views, ...taps];
  const max = Math.max(...all) * 1.1;
  const stepX = innerW / (views.length - 1);
  const pt = (arr, i) => [padL + i * stepX, padT + innerH - (arr[i] / max) * innerH];
  const pathFor = (arr) => arr.map((_, i) => `${i === 0 ? "M" : "L"} ${pt(arr, i)[0].toFixed(1)} ${pt(arr, i)[1].toFixed(1)}`).join(" ");
  const areaFor = (arr) => pathFor(arr) + ` L ${padL + innerW} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="dash-line" preserveAspectRatio="none" aria-hidden="true">
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line key={i} x1={padL} x2={padL + innerW} y1={padT + innerH * g} y2={padT + innerH * g} stroke="var(--line)" strokeDasharray="2 4" />
      ))}
      {/* taps area */}
      <path d={areaFor(taps)} fill="var(--accent-soft)" opacity="0.7" />
      <path d={pathFor(taps)} fill="none" stroke="var(--accent-deep)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* views line on top */}
      <path d={pathFor(views)} fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {views.map((_, i) => {
        const [x, y] = pt(views, i);
        return <circle key={i} cx={x} cy={y} r={i === views.length - 1 ? 3 : 0} fill="var(--ink)" />;
      })}
      {/* x labels */}
      {days.map((d, i) => (
        <text key={i} x={padL + i * stepX} y={h - 6} textAnchor="middle" fontSize="8" fill="var(--ink-faint)" fontFamily="var(--font-mono)">{d}</text>
      ))}
    </svg>
  );
}

function DonutChart({ parts }) {
  const r = 38, R = 52, cx = 60, cy = 60;
  const total = parts.reduce((s, p) => s + p.v, 0);
  let acc = 0;
  const arcs = parts.map((p, i) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += p.v;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x0 = cx + R * Math.cos(start), y0 = cy + R * Math.sin(start);
    const x1 = cx + R * Math.cos(end), y1 = cy + R * Math.sin(end);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const x3 = cx + r * Math.cos(start), y3 = cy + r * Math.sin(start);
    return (
      <path
        key={i}
        d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`}
        fill={p.c}
      />
    );
  });
  return (
    <svg viewBox="0 0 120 120" className="dash-donut" aria-hidden="true">
      {arcs}
      <text x="60" y="58" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--ink-faint)">total</text>
      <text x="60" y="74" textAnchor="middle" fontSize="14" fontFamily="var(--font-display)" fill="var(--ink)">100%</text>
    </svg>
  );
}

/* Mini phone — small companion shown as the guest-side preview */
function DashPhoneMini({ t, lang }) {
  return (
    <div className="dphone">
      <div className="dphone-screen">
        <div className="dphone-head">
          <div className="dphone-lang">
            <span>{lang === "hr" ? "🇭🇷 HR" : "🇬🇧 EN"}</span>
          </div>
          <div className="dphone-hotel">Villa Maris</div>
          <div className="dphone-room">Suite 204</div>
        </div>
        <div className="dphone-links">
          {[
            { i: "🍷", k: "phone.link.restaurant" },
            { i: "✦", k: "phone.link.spa" },
            { i: "≋", k: "phone.link.pool" },
            { i: "⌁", k: "phone.link.wifi" },
          ].map((l, idx) => (
            <div key={idx} className="dphone-link">
              <span className="dphone-link-icon">{l.i}</span>
              <span>{t(l.k)}</span>
            </div>
          ))}
        </div>
        <div className="dphone-cta">{t("dash.phone.cta")}</div>
      </div>
    </div>
  );
}

window.DashboardPreview = DashboardPreview;
