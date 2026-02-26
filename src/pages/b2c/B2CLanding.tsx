import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search, Sparkles, Bell, MessageSquare, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "AI-Powered Matching",
    desc: "Tell us what you want — even vague vibes — and our AI ranks every listing by how well it fits you.",
  },
  {
    icon: Bell,
    title: "Early Warning Alerts",
    desc: "Get notified the moment a high-match listing hits the market. Be first, not last.",
  },
  {
    icon: MessageSquare,
    title: "Bot-Assisted Outreach",
    desc: "Let our bot contact agents, schedule viewings, and negotiate on your behalf.",
  },
];

export default function B2CLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-3xl mx-auto gap-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Home className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
          Find your perfect home in <span className="text-primary">Luxembourg</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          AI-powered property discovery. Swipe through curated matches, get early
          alerts on new listings, and let our bot handle the outreach — so you
          just show up to viewings.
        </p>
        <Button
          size="lg"
          className="text-base px-8 py-6 rounded-xl gap-2 shadow-lg"
          onClick={() => navigate("/b2c/onboarding")}
        >
          Start Free Search
          <ArrowRight className="w-4 h-4" />
        </Button>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card py-16 px-6">
        <div className="max-w-4xl mx-auto grid gap-8 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-10">
          <h2 className="text-2xl font-bold text-foreground">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3 text-left">
            {[
              { step: "1", title: "Set preferences", desc: "Answer a few quick questions or record a voice note describing your ideal place." },
              { step: "2", title: "Swipe & discover", desc: "Browse AI-ranked listings. Swipe right to save, left to skip." },
              { step: "3", title: "Bot contacts agents", desc: "Our bot reaches out, schedules viewings, and keeps you posted." },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <span className="text-2xl font-bold text-primary/40">{s.step}</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{s.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border bg-card py-12 px-6 text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <Sparkles className="w-6 h-6 text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">
            Powered by the same database used by 50+ agencies across Luxembourg.
          </p>
          <Button variant="outline" onClick={() => navigate("/b2c/onboarding")}>
            Get Started
          </Button>
        </div>
      </section>
    </div>
  );
}
