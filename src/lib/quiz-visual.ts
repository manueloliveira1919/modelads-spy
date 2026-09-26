import type { CSSProperties } from "react";
import type { QuizSettings } from "@/lib/quiz-types";

export const QUIZ_FONTS = [
  "Poppins",
  "Inter",
  "Montserrat",
  "Roboto",
  "Open Sans",
  "Lato",
  "Nunito",
  "Raleway",
  "Oswald",
  "Playfair Display",
  "Merriweather",
  "Bebas Neue",
] as const;

export const QUIZ_ANIMATIONS = [
  { value: "none", label: "Nenhuma" },
  { value: "fade-in", label: "Fade In" },
  { value: "fade-up", label: "Fade Up" },
  { value: "fade-down", label: "Fade Down" },
  { value: "fade-left", label: "Fade Left" },
  { value: "fade-right", label: "Fade Right" },
  { value: "zoom-in", label: "Zoom In" },
  { value: "zoom-out", label: "Zoom Out" },
  { value: "bounce", label: "Bounce" },
  { value: "pulse", label: "Pulse" },
] as const;

export type QuizAnimation = (typeof QUIZ_ANIMATIONS)[number]["value"];
export type VisualSettings = Record<string, unknown>;

type VisualCss = CSSProperties & {
  "--quiz-font-size"?: string;
  "--quiz-animation-duration"?: string;
  "--quiz-animation-delay"?: string;
};

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function visualAnimation(settings: VisualSettings): QuizAnimation {
  const value = String(settings.animation ?? "none") as QuizAnimation;
  return QUIZ_ANIMATIONS.some((option) => option.value === value) ? value : "none";
}

export function animationClass(settings: VisualSettings): string | undefined {
  const animation = visualAnimation(settings);
  return animation === "none" ? undefined : `quiz-animation-${animation}`;
}

export function animationStyle(settings: VisualSettings): VisualCss {
  return {
    "--quiz-animation-duration": `${numberInRange(settings.animationDuration, 0.6, 0.2, 3)}s`,
    "--quiz-animation-delay": `${numberInRange(settings.animationDelay, 0, 0, 2)}s`,
  };
}

export function textVisualStyle(
  settings: VisualSettings,
  quiz: QuizSettings,
  fallbackSize = 16,
  fallbackWeight = 400,
): VisualCss {
  const size = numberInRange(settings.size, fallbackSize, 10, 120);
  return {
    "--quiz-font-size": `${size}px`,
    fontFamily: `${String(settings.fontFamily || quiz.font)}, system-ui, sans-serif`,
    fontSize: size,
    fontWeight: numberInRange(settings.weight, fallbackWeight, 300, 800),
    fontStyle: settings.fontStyle === "italic" ? "italic" : "normal",
    textDecoration: settings.textDecoration === "underline" ? "underline" : "none",
    textAlign: (settings.align as CSSProperties["textAlign"]) || "center",
    color: String(settings.color || quiz.colors.text),
    lineHeight: numberInRange(settings.lineHeight, 1.35, 1, 2.2),
    letterSpacing: `${numberInRange(settings.letterSpacing, 0, 0, 12)}px`,
    overflowWrap: "anywhere",
    maxWidth: "100%",
  };
}

export function buttonTextVisualStyle(settings: VisualSettings, quiz: QuizSettings): VisualCss {
  return {
    ...textVisualStyle(settings, quiz, 16, 700),
    color: String(settings.color || quiz.colors.buttonText),
  };
}

/** Coleta as fontes usadas (global + por elemento) para carregar sob demanda. */
export function collectQuizFonts(
  quiz: QuizSettings,
  elements: { settings: Record<string, unknown> }[],
): string[] {
  const set = new Set<string>();
  const known = new Set<string>(QUIZ_FONTS);
  if (known.has(quiz.font)) set.add(quiz.font);
  for (const el of elements) {
    const f = String(el.settings?.fontFamily ?? "");
    if (known.has(f)) set.add(f);
  }
  return [...set].sort();
}

export function quizFontsHref(fonts: string[]): string | null {
  if (!fonts.length) return null;
  const families = fonts
    .map((f) =>
      f === "Bebas Neue" ? "family=Bebas+Neue" : `family=${f.replace(/ /g, "+")}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700`,
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
