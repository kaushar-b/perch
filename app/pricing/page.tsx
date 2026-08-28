import PublicNav from "../PublicNav";
import Footer from "../Footer";

export default function PricingPage() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      tagline: "Try it, track a few listings.",
      features: ["3 tracked keywords", "Daily rank tracking", "7-day history chart", "Free rank checker"],
      cta: "Start free",
      href: "/login",
      featured: false,
    },
    {
      name: "Seller",
      price: "$9",
      tagline: "For active sellers growing their store.",
      features: ["25 tracked keywords", "Daily rank tracking", "Full history chart", "Drop alerts", "Email support"],
      cta: "Choose Seller",
      href: "https://vermelhoai.lemonsqueezy.com/checkout/buy/1aca1e6c-20d2-4807-bf07-1c7acac8cf7b",
      featured: true,
    },
    {
      name: "Pro",
      price: "$19",
      tagline: "For power sellers with big catalogs.",
      features: ["Unlimited keywords", "Daily rank tracking", "Full history chart", "Drop alerts", "Priority support"],
      cta: "Choose Pro",
      href: "https://vermelhoai.lemonsqueezy.com/checkout/buy/2a21b039-46cc-40e5-8995-91af62c9d33d",
      featured: false,
    },
  ];

  return (
    <div className="wrap">
      <PublicNav />
      <section className="pricing">
        <h1 className="pricing__title">Simple pricing that pays for itself.</h1>
        <p className="pricing__sub">One sale you win back from better rankings covers months of perchRank.</p>
        <div className="tiers">
          {tiers.map((t) => (
            <div key={t.name} className={`tier ${t.featured ? "tier--featured" : ""}`}>
              {t.featured && <span className="tier__badge">Most popular</span>}
              <h2 className="tier__name">{t.name}</h2>
              <div className="tier__price">{t.price}<span className="tier__per">/mo</span></div>
              <p className="tier__tagline">{t.tagline}</p>
              <ul className="tier__features">
                {t.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <a href={t.href} className={`btn ${t.featured ? "" : "btn--outline"}`}>{t.cta}</a>
            </div>
          ))}
        </div>
        <p className="pricing__note">Prices in USD. Cancel anytime. No card needed for the free plan.</p>
      </section>
      <Footer />
    </div>
  );
}