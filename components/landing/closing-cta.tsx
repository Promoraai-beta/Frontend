import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { LandingPageSection } from "@/components/landing/landing-page-width"

export function ClosingCTA() {
  return (
    <section id="about" className="relative section-ink overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--accent-glow) / 0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
        }}
      />
      <div
        className="glow-orb"
        style={{
          background: "hsl(var(--accent) / 0.55)",
          width: 700,
          height: 700,
          bottom: -300,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <LandingPageSection className="relative py-32 md:py-44 text-center">
        <h2 className="display text-4xl md:text-6xl max-w-4xl mx-auto">
          The interview that matches{" "}
          <span className="display-italic">how work actually happens.</span>
        </h2>
        <p className="mt-6 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
          Stop evaluating for a world that doesn&apos;t exist anymore.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="font-mono text-xs uppercase tracking-[0.2em] bg-transparent text-foreground border-foreground/30 hover:bg-foreground/10 hover:text-foreground rounded-full px-8 h-12"
          >
            See a Sample Report
          </Button>
          <Button
            size="lg"
            className="font-mono text-xs uppercase tracking-[0.2em] bg-accent text-accent-foreground hover:bg-accent-deep rounded-full px-8 h-12 shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.8)]"
          >
            Book Demo
            <ArrowRight className="ml-1" />
          </Button>
        </div>
      </LandingPageSection>
    </section>
  )
}
