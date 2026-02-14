import Link from "next/link"

export function Footer() {
  return (
    <footer className="relative border-t border-white/20 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black py-12">
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/20 via-white/5 to-transparent" />
      {/* Grid texture overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="container relative mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-bold text-white">PromoraAI</h3>
            <p className="text-sm text-zinc-400">AI-powered assessment tracking for modern recruitment teams.</p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="#features" className="hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#compare" className="hover:text-white">
                  Compare
                </Link>
              </li>
              <li>
                <Link href="#demo" className="hover:text-white">
                  Demo
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Company</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link href="#features" className="hover:text-white">
                  About
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-zinc-800 pt-8 text-center text-sm text-zinc-400">
          <p>&copy; 2025 PromoraAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
