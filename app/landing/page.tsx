// PromoraAI Landing Page
// Acts 1–2. Building incrementally per spec order.

import "./tokens.css"
import "./typography.css"
import { PromoraNav }      from "@/components/homepage/promora-nav"
import { Act1Hero }        from "@/components/homepage/act1-hero"
import { Act2Scoresheet }  from "@/components/homepage/act2-scoresheet"

export default function LandingPage() {
  return (
    <div className="promora-landing" style={{ background: "var(--ink)", minHeight: "100svh" }}>
      <PromoraNav />
      <Act1Hero />
      <Act2Scoresheet />
    </div>
  )
}
