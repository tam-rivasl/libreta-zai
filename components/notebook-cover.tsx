"use client"

import { useEffect, useState, type CSSProperties } from "react"

const DEFAULT_COVER_SRC = "/images/notebook-cover.jpg"
const OPEN_EASE = "cubic-bezier(0.18, 0.9, 0.2, 1)"
const PAGE_FOLD_EASE = OPEN_EASE
const OPEN_SCENE_MS = 1900
const OPEN_PAGE_MS = 1900
const OPEN_COVER_MS = 1900
const HINGE_LEFT = "9.25%"
const OPEN_CENTER_SHIFT = "clamp(30px, 8vw, 68px)"

interface NotebookCoverProps {
  onOpen?: () => void
  isOpen: boolean
  coverImageUrl?: string | null
  allowDefaultCover?: boolean
  interactive?: boolean
  showHint?: boolean
}

export function NotebookCover({
  onOpen,
  isOpen,
  coverImageUrl,
  allowDefaultCover = true,
  interactive = true,
  showHint = true,
}: NotebookCoverProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [coverLoadFailed, setCoverLoadFailed] = useState(false)
  const normalizedCoverSrc =
    typeof coverImageUrl === "string" && coverImageUrl.trim().length > 0
      ? coverImageUrl
      : null
  const coverSrc = normalizedCoverSrc ?? (allowDefaultCover ? DEFAULT_COVER_SRC : null)
  const effectiveCoverSrc =
    coverLoadFailed && allowDefaultCover ? DEFAULT_COVER_SRC : coverSrc
  const lineStep = 24
  const canHover = interactive && !isOpen
  const handleOpen = () => {
    if (!interactive) return
    onOpen?.()
  }
  const innerPaperStyle =
    `repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent ${lineStep - 1}px,
      color-mix(in srgb, var(--nb-line, #d4c5a9) 72%, transparent) ${lineStep - 1}px,
      color-mix(in srgb, var(--nb-line, #d4c5a9) 72%, transparent) ${lineStep}px
    )`

  // Keep proportions stable across medium/small screens by constraining with vw and dvh.
  const bookW =
    "min(clamp(210px, 68vw, 390px), calc((100dvh - 140px) * 0.7142857))"
  const sceneVars = {
    ['--cover-book-w' as string]: bookW,
  } as CSSProperties
  const sceneTransform = isOpen
    ? `translateX(${OPEN_CENTER_SHIFT}) rotateY(-8deg) rotateX(2deg) scale(1.01)`
    : canHover && isHovered
      ? "rotateX(6deg) rotateY(-6deg) translateY(-6px)"
      : "none"
  const pageBlockTransform = isOpen
    ? "translateX(0.8%) scaleX(0.995)"
    : "translateX(0%) scaleX(1)"
  const turningSheetTransform = isOpen
    ? "rotateY(-174deg) translateZ(-1px)"
    : "rotateY(0deg) translateZ(-8px)"

  useEffect(() => {
    setCoverLoadFailed(false)
  }, [coverSrc])

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center gap-0"
      style={{ perspective: "2000px", ...sceneVars }}
    >
      {/* Ground shadow */}
      <div
        className="absolute rounded-full"
        style={{
          width: "max(150px, calc(var(--cover-book-w) * 0.67))",
          height: "clamp(32px, calc(var(--cover-book-w) * 0.12), 44px)",
          bottom: "calc(50% - (var(--cover-book-w) * 0.68))",
          background: "rgba(0,0,0,0.5)",
          filter: "blur(24px)",
          transform: isOpen ? "scaleX(2.2) translateX(72px)" : "scaleX(1)",
          opacity: isOpen ? 0.12 : 0.48,
          transition: `all ${OPEN_SCENE_MS}ms ${OPEN_EASE}`,
        }}
      />

      {/* ── 3-D Book scene ── */}
      <div
        className={`relative select-none ${interactive ? "cursor-pointer" : "cursor-default"}`}
        style={{
          width: "var(--cover-book-w)",
          aspectRatio: "5 / 7",
          height: "auto",
          transformStyle: "preserve-3d",
          transform: sceneTransform,
          transition: `transform ${OPEN_SCENE_MS}ms ${OPEN_EASE}`,
          pointerEvents: isOpen ? "none" : "auto",
        }}
        onClick={handleOpen}
        onMouseEnter={() => {
          if (canHover) setIsHovered(true)
        }}
        onMouseLeave={() => setIsHovered(false)}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? "Abrir libreta" : undefined}
        onKeyDown={(e) => {
          if (!interactive) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleOpen()
          }
        }}
      >
        {/* ── Back cover (always visible behind) ── */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: "8px",
            background:
              "linear-gradient(160deg, color-mix(in srgb, var(--nb-accent, #8B4513) 65%, #2a1508) 0%, color-mix(in srgb, var(--nb-accent, #8B4513) 35%, #2a1508) 60%, #2a1508 100%)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
          }}
        />

        {/* ── Page stack — static text block ── */}
        <div
          className="absolute top-3 bottom-3"
          style={{
            left: HINGE_LEFT,
            right: "4px",
            background:
              "repeating-linear-gradient(to right, #e8dcc8, #f5ede0 3px, #e2d4bc 4px)",
            borderRadius: "0 4px 4px 0",
            transform: pageBlockTransform,
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            boxShadow: isOpen
              ? "inset 14px 0 18px rgba(42,20,10,0.42), 3px 0 12px rgba(0,0,0,0.26)"
              : "inset 0 0 0 rgba(0,0,0,0), 0 0 0 rgba(0,0,0,0)",
            transition: `transform ${OPEN_PAGE_MS}ms ${OPEN_EASE} 70ms, box-shadow ${OPEN_PAGE_MS}ms ${OPEN_EASE} 70ms`,
            willChange: "transform",
          }}
        />

        {/* ── Turning sheet — folds with the cover for a more natural motion ── */}
        <div
          className="absolute top-3 bottom-3 z-[6] pointer-events-none"
          style={{
            left: HINGE_LEFT,
            right: "4px",
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            transform: turningSheetTransform,
            opacity: 1,
            overflow: "hidden",
            transition: `transform ${OPEN_PAGE_MS}ms ${PAGE_FOLD_EASE} 60ms`,
            willChange: "transform",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              borderRadius: "0 4px 4px 0",
              backgroundColor: "var(--nb-paper, #f5ecd8)",
              backgroundImage: innerPaperStyle,
              transformOrigin: "left center",
              transform: "translateZ(0.6px)",
              boxShadow: isOpen
                ? "inset 20px 0 24px rgba(34,16,8,0.38), 8px 0 20px rgba(0,0,0,0.25)"
                : "inset 0 0 0 rgba(0,0,0,0), 1px 0 8px rgba(0,0,0,0.1)",
              backfaceVisibility: "visible",
            }}
          />

          {/* Fold crease near the spine while the sheet turns */}
          <div
            className="absolute inset-y-0 left-0 pointer-events-none"
            style={{
              width: "15%",
              background:
                "linear-gradient(to right, rgba(52,24,12,0.32), rgba(255,247,233,0.26), transparent)",
              opacity: isOpen ? 1 : 0.18,
              transition: `opacity ${OPEN_PAGE_MS}ms ${PAGE_FOLD_EASE} 90ms`,
            }}
          />
        </div>

        {/* ── Leather spine (left strip) ── */}
        <div
          className="absolute top-0 left-0 bottom-0 z-30"
          style={{
            width: "9%",
            borderRadius: "8px 0 0 8px",
            background:
              "linear-gradient(to right, #1a0a04, color-mix(in srgb, var(--nb-accent, #8B4513) 35%, #2a1508), color-mix(in srgb, var(--nb-accent, #8B4513) 82%, #2a1508), color-mix(in srgb, var(--nb-accent, #8B4513) 35%, #2a1508), #1a0a04)",
            boxShadow: "inset 2px 0 8px rgba(0,0,0,0.6), 4px 0 14px rgba(0,0,0,0.4)",
          }}
        >
          {/* Cord knots */}
          {[8, 16, 24, 74, 82, 90].map((pct, i) => (
            <div
              key={i}
              className="absolute left-0.5 right-0.5 rounded"
              style={{
                top: `${pct}%`,
                height: "6px",
                background: "linear-gradient(to bottom, #3a1d0e, #6b3a1a, #3a1d0e)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}
            />
          ))}
        </div>

        {/* ── Front cover — flips open ── */}
        <div
          className="absolute inset-0 overflow-hidden z-20"
          style={{
            borderRadius: "8px",
            clipPath: "inset(0 round 8px)",
            isolation: "isolate",
            transformOrigin: `${HINGE_LEFT} center`,
            transformStyle: "preserve-3d",
            backfaceVisibility: "visible",
            transform: isOpen ? "rotateY(-174deg)" : "rotateY(0deg)",
            transition: `transform ${OPEN_COVER_MS}ms ${OPEN_EASE}`,
            boxShadow: canHover && isHovered
              ? "10px 10px 35px rgba(0,0,0,0.6)"
              : "4px 4px 18px rgba(0,0,0,0.45)",
          }}
        >
          {/* The real zorzal photo */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(150deg, color-mix(in srgb, var(--nb-accent, #8B4513) 62%, #2a1508) 0%, #2a1508 100%)",
            }}
          />
          {effectiveCoverSrc ? (
            <img
              src={effectiveCoverSrc}
              alt="Libreta de cuero con zorzal grabado"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ backfaceVisibility: "hidden" }}
              onError={() => {
                if (allowDefaultCover && effectiveCoverSrc !== DEFAULT_COVER_SRC) {
                  console.error('No se pudo cargar portada personalizada:', effectiveCoverSrc)
                  setCoverLoadFailed(true)
                }
              }}
            />
          ) : null}

          {/* Vignette depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 55% 48%, transparent 40%, rgba(20,8,2,0.5) 100%)",
            }}
          />

          {/* Hinge depth: grows while opening for a stronger physical cue */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none"
            style={{
              width: "12%",
              background:
                "linear-gradient(to right, rgba(14,6,3,0.62), rgba(14,6,3,0.24), transparent)",
              opacity: isOpen ? 0.98 : 0.58,
              transition: `opacity ${OPEN_COVER_MS}ms ${OPEN_EASE}`,
            }}
          />

          {/* Hover sheen */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(125deg, transparent 25%, rgba(255,220,150,0.07) 50%, transparent 75%)",
              opacity: canHover && isHovered ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          />

          {/* Opening streak: subtle traveling highlight to improve perceived motion */}
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{
              width: "32%",
              left: "-30%",
              transform: isOpen ? "translateX(430%) skewX(-10deg)" : "translateX(0%) skewX(-10deg)",
              background:
                "linear-gradient(to right, transparent 0%, rgba(255, 225, 170, 0.16) 45%, transparent 100%)",
              opacity: isOpen ? 0.55 : 0,
              transition: `transform ${OPEN_COVER_MS}ms ${OPEN_EASE}, opacity ${OPEN_COVER_MS}ms ${OPEN_EASE}`,
            }}
          />

          {/* Inner side of cover (visible when fully opened) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg) translateZ(1px)",
              backgroundColor: "var(--nb-paper, #f5ecd8)",
              backgroundImage: innerPaperStyle,
            }}
          />
        </div>
      </div>

      {showHint ? (
        <p
          className="font-serif text-xs tracking-widest uppercase animate-pulse mt-6 md:mt-10"
          style={{
            color: "#e7dcc7",
            textShadow: "0 2px 10px rgba(22,10,4,0.75)",
            opacity: isOpen ? 0 : 1,
            transition: "opacity 0.35s ease",
            pointerEvents: "none",
          }}
        >
          Toca para abrir
        </p>
      ) : null}
    </div>
  )
}
