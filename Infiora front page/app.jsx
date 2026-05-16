// Root app: language state, tweaks panel, scroll-to handlers,
// FAQ schema injection, and section composition.
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "moss",
  "display": "instrument",
  "language": "en"
}/*EDITMODE-END*/;

const ACCENTS = {
  moss:   { name: "Moss",    fg: "oklch(0.42 0.06 160)", soft: "oklch(0.94 0.02 160)", deep: "oklch(0.32 0.06 160)" },
  clay:   { name: "Clay",    fg: "oklch(0.52 0.10 50)",  soft: "oklch(0.95 0.03 50)",  deep: "oklch(0.40 0.10 45)" },
  ink:    { name: "Ink",     fg: "oklch(0.30 0.04 245)", soft: "oklch(0.94 0.01 245)", deep: "oklch(0.22 0.04 245)" },
  rose:   { name: "Rose",    fg: "oklch(0.50 0.10 18)",  soft: "oklch(0.96 0.02 18)",  deep: "oklch(0.38 0.10 18)" },
};

const DISPLAY_FONTS = {
  instrument: { name: "Instrument Serif", stack: '"Instrument Serif", "Cormorant Garamond", Georgia, serif' },
  fraunces:   { name: "Cormorant",        stack: '"Cormorant Garamond", "EB Garamond", Georgia, serif' },
  geistsans:  { name: "Geist Sans",       stack: '"Geist", "Inter", system-ui, sans-serif' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const lang = t.language === "hr" ? "hr" : "en";
  const accent = ACCENTS[t.accent] || ACCENTS.moss;
  const display = DISPLAY_FONTS[t.display] || DISPLAY_FONTS.instrument;

  const tt = useMemoA(() => {
    const dict = (window.INFIORA_I18N || {})[lang] || {};
    return (key) => dict[key] ?? key;
  }, [lang]);

  // Update document title + html lang for SEO/A11y
  useEffectA(() => {
    document.title = tt("meta.title");
    document.documentElement.lang = lang;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", tt("meta.description"));
  }, [lang, tt]);

  // Apply CSS variables for accent/display
  useEffectA(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", accent.fg);
    r.style.setProperty("--accent-soft", accent.soft);
    r.style.setProperty("--accent-deep", accent.deep);
    r.style.setProperty("--font-display", display.stack);
  }, [accent, display]);

  // Inject FAQ schema for SEO/LLM
  useEffectA(() => {
    const id = "faq-schema";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    const faq = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
      "@type": "Question",
      "name": tt(`faq.items.${i}.q`),
      "acceptedAnswer": { "@type": "Answer", "text": tt(`faq.items.${i}.a`) },
    }));
    const data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faq,
    };
    el.textContent = JSON.stringify(data);
  }, [lang, tt]);

  // Inject Organization + SoftwareApplication schema (richer LLM signal)
  useEffectA(() => {
    const id = "org-schema";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    const data = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Infiora",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Hospitality operations platform",
      "operatingSystem": "Web",
      "description": tt("meta.description"),
      "offers": { "@type": "Offer", "priceCurrency": "EUR", "price": "0", "availability": "https://schema.org/InStock", "description": "Quote-based pricing" },
      "audience": [
        { "@type": "Audience", "audienceType": "Hotels" },
        { "@type": "Audience", "audienceType": "Apartments" },
        { "@type": "Audience", "audienceType": "Villas" },
        { "@type": "Audience", "audienceType": "Property managers" }
      ],
    };
    el.textContent = JSON.stringify(data);
  }, [lang, tt]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <>
      <Nav t={tt} lang={lang} setLang={(l) => setTweak("language", l)} onCta={() => scrollTo("quote")} />
      <main>
        <Hero t={tt} lang={lang} onCta={() => scrollTo("quote")} onSecondary={() => scrollTo("how")} />
        <Problem t={tt} />
        <Solution t={tt} />
        <Features t={tt} />
        <Revenue t={tt} />
        <Materials t={tt} />
        <BuiltFor t={tt} />
        <HowItWorks t={tt} />
        <Trust t={tt} />
        <QuoteForm t={tt} />
        <FAQ t={tt} />
      </main>
      <Footer t={tt} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Language" />
        <TweakRadio
          label="Site language"
          value={t.language}
          options={["en", "hr"]}
          onChange={(v) => setTweak("language", v)}
        />
        <TweakSection label="Accent" />
        <TweakRadio
          label="Brand accent"
          value={t.accent}
          options={["moss", "clay", "ink", "rose"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakSection label="Display font" />
        <TweakRadio
          label="Headlines"
          value={t.display}
          options={["instrument", "fraunces", "geistsans"]}
          onChange={(v) => setTweak("display", v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
