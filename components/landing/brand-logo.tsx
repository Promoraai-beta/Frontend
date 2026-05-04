import { PromoraMark } from "@/components/landing/promora-mark"

type Props = {
  name: "HackerRank" | "CodeSignal" | "Rounds" | "CoderPad" | "Saffron" | "Promora"
  tone?: "default" | "ink"
}

const monoFilter = "brightness-0 dark:brightness-0 dark:invert"

export function BrandLogo({ name }: Props) {
  switch (name) {
    case "HackerRank":
      return (
        <img
          src="/brands/hackerrank.svg"
          alt="HackerRank"
          className={`h-3 w-auto select-none ${monoFilter}`}
          draggable={false}
        />
      )
    case "CodeSignal":
      return (
        <img
          src="/brands/codesignal.svg"
          alt="CodeSignal"
          className={`h-4 w-auto select-none ${monoFilter}`}
          draggable={false}
        />
      )
    case "Rounds":
      return (
        <img
          src="/brands/rounds.png"
          alt="Rounds"
          className={`h-5 w-auto select-none object-contain ${monoFilter}`}
          draggable={false}
        />
      )
    case "CoderPad":
      return (
        <span className="font-serif text-[15px] font-medium tracking-tight text-foreground select-none">
          coder<span className="italic">pad</span>
        </span>
      )
    case "Saffron":
      return (
        <img
          src="/brands/promora.svg"
          alt="Saffron"
          className="h-6 w-auto select-none object-contain dark:brightness-0 dark:invert"
          draggable={false}
        />
      )
    case "Promora":
      return (
        <div className="flex items-center gap-2">
          <PromoraMark size={20} className="text-foreground" />
          <span className="font-brand text-[15px] font-medium tracking-tight text-foreground">
            Promora
          </span>
        </div>
      )
  }
}
