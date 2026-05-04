"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react"

import { PromoraMark } from "@/components/landing/promora-mark"
import { ThemeToggle } from "@/components/landing/theme-toggle"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toaster } from "@/components/ui/sonner"
import { login } from "@/lib/auth"
import { navigateAfterAuth } from "@/lib/navigate-after-auth"

const fieldClass =
  "h-11 rounded-xl border-foreground/15 bg-background/60 backdrop-blur px-4 text-sm focus-visible:ring-accent/40"
const labelClass = "font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/70"
const loginSubmitClass =
  "w-full rounded-xl h-11 !bg-accent hover:!bg-accent-deep shadow-[0_10px_30px_-10px_hsl(var(--accent)/0.6)] transition-all !text-white font-semibold text-[15px] leading-none tracking-normal antialiased [&_svg]:!text-white [&_svg]:shrink-0 border-0 focus-visible:ring-accent/50"

const NOISE_DATA_URL = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
)}")`

const PROMORA_MASK_SVG = encodeURIComponent(
  `<svg viewBox="0 0 328 366" xmlns="http://www.w3.org/2000/svg"><path fill="black" d="M 41 93 L 38 98 L 25 147 L 26 156 L 34 165 L 44 169 L 181 169 L 185 176 L 183 181 L 73 254 L 68 259 L 63 269 L 63 279 L 67 286 L 109 323 L 119 324 L 128 320 L 137 310 L 202 205 L 207 204 L 211 207 L 197 331 L 202 339 L 209 340 L 241 326 L 247 318 L 248 305 L 236 229 L 226 201 L 206 169 L 179 143 L 147 124 L 64 89 L 52 88 Z"/><path fill="black" d="M 202 40 L 200 46 L 207 95 L 217 126 L 228 147 L 242 166 L 258 181 L 274 190 L 295 198 L 300 198 L 302 189 L 299 167 L 296 161 L 292 159 L 252 158 L 250 154 L 251 149 L 283 125 L 282 117 L 268 94 L 262 93 L 238 128 L 234 129 L 231 126 L 237 70 L 236 61 L 230 54 L 210 41 Z"/><path fill="black" d="M 108 31 L 105 35 L 105 42 L 110 50 L 179 125 L 188 132 L 191 132 L 203 123 L 203 116 L 158 33 L 147 25 Z"/><path fill="black" d="M 249 189 L 240 200 L 240 208 L 277 276 L 284 277 L 288 271 L 296 249 L 296 239 L 262 199 L 252 189 Z"/></svg>`,
)

const maskUrl = `url("data:image/svg+xml;charset=utf-8,${PROMORA_MASK_SVG}")`

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuth()

  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  const sessionId = searchParams.get("sessionId")

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) setLoginEmail(emailParam)
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("tab") !== "signup") return
    const p = new URLSearchParams(searchParams.toString())
    p.delete("tab")
    const q = p.toString()
    router.replace(q ? `/auth?${q}` : "/auth", { scroll: false })
  }, [router, searchParams])

  const onLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)
    try {
      const user = await login(loginEmail, loginPassword)
      if (user) {
        setUser(user)
        await navigateAfterAuth(user, router, {
          sessionId,
          variant: "login",
        })
      } else {
        setLoginError("Invalid email or password")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password"
      setLoginError(message)
      toast.error(message)
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <main className="h-screen w-full bg-background text-foreground overflow-hidden flex p-3 gap-3">
        <aside className="relative hidden lg:flex w-[40%] xl:w-[38%] shrink-0 rounded-3xl section-ink flex-col overflow-hidden p-8 xl:p-10 [&_img]:brightness-0 [&_img]:invert dark:[&_img]:invert-0">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--accent-glow) / 0.55) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage:
                "radial-gradient(ellipse 80% 80% at 30% 40%, black 30%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 80% 80% at 30% 40%, black 30%, transparent 80%)",
            }}
          />
          <div
            className="glow-orb z-0"
            style={{
              background: "hsl(var(--accent) / 0.45)",
              width: 520,
              height: 520,
              bottom: -220,
              left: -140,
            }}
          />
          <div
            aria-hidden
            className="absolute -bottom-16 -right-16 pointer-events-none select-none z-[1]"
            style={{
              width: 360,
              height: 360,
              opacity: 0.12,
              backgroundImage: `${NOISE_DATA_URL}, linear-gradient(hsl(var(--accent-glow)), hsl(var(--accent-glow)))`,
              backgroundBlendMode: "overlay",
              WebkitMaskImage: maskUrl,
              maskImage: maskUrl,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />

          <div className="relative z-[2] flex flex-col flex-1 min-h-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 w-fit">
              <PromoraMark size={28} className="text-foreground" />
              <span className="font-brand text-lg font-medium tracking-tight text-foreground">
                Promora
              </span>
            </Link>

            <div className="flex-1 flex flex-col justify-center min-h-0 py-6">
              <div className="relative mt-auto mb-auto -translate-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-foreground/5 backdrop-blur px-3 py-1 mb-5">
                  <Sparkles className="h-3 w-3 text-accent-glow" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-80">
                    Hiring for the AI-native workplace
                  </span>
                </div>
                <h2 className="display text-[40px] xl:text-5xl leading-[1.02]">
                  Hire engineers who actually <span className="display-italic">engineer.</span>
                </h2>
                <p className="mt-4 text-sm xl:text-base opacity-70 max-w-md leading-relaxed">
                  See exactly how every candidate works with AI — before you make a call.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-w-0 rounded-3xl bg-background lg:bg-transparent overflow-hidden">
          <div className="flex items-center justify-between w-full gap-3 px-1 pt-1 pb-3 lg:px-2 lg:pt-2 shrink-0">
            <Link href="/" className="flex lg:hidden items-center gap-2">
              <PromoraMark size={24} className="text-foreground" />
              <span className="font-brand text-base font-medium tracking-tight">Promora</span>
            </Link>
            <div className="hidden lg:flex flex-1 justify-end items-center gap-4">
              <Link
                href="/"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to site
              </Link>
              <ThemeToggle />
            </div>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-0 px-4 pb-4 lg:px-8 overflow-y-auto scrollbar-none">
            <div className="w-full max-w-[420px] mx-auto flex flex-col gap-4 min-h-0 py-2">
              <h1 className="display text-3xl md:text-[34px] leading-[1.05] shrink-0">
                Welcome <span className="display-italic">back.</span>
              </h1>

              <form onSubmit={onLoginSubmit} className="space-y-3 outline-none">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className={labelClass}>
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={loginLoading}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="login-password" className={labelClass}>
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold font-sans tracking-normal text-accent hover:text-accent-deep transition-colors antialiased [-webkit-font-smoothing:antialiased]"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loginLoading}
                      className={`${fieldClass} pr-11`}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowLoginPassword((v) => !v)}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {loginError ? <p className="text-sm text-destructive">{loginError}</p> : null}
                <Button
                  type="submit"
                  disabled={loginLoading}
                  size="lg"
                  className={`${loginSubmitClass} mt-4 h-11 px-6`}
                >
                  {loginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      Log In
                      <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-white" strokeWidth={2.5} />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  )
}

/*
================================================================================
ARCHIVED — Public signup tab + handlers (comment-only; not in bundle / DOM).
Restore:
  • Add imports: useCallback, Checkbox, Tabs/TabsContent/TabsList/TabsTrigger,
    register, ADMIN_EMAIL (and keep login).
  • In AuthPageInner: remove the effect that deletes ?tab=signup from URL.
  • Add tab/signup state, syncTabToUrl, onSignupSubmit, tab/email effects (signup).
  • Wrap form column in <Tabs value={tab} onValueChange={(v)=>syncTabToUrl(...)}>
    — conditional h1 + subtext (Create account / Log in buttons),
      TabsList + sliding pill + two TabsTriggers,
      TabsContent login (current form), TabsContent signup (name/email/password,
      terms Checkbox, recruiter mailto footer with ADMIN_EMAIL).
See git history pre-"Hide signup" for the full dual-tab page if needed.
================================================================================
*/
