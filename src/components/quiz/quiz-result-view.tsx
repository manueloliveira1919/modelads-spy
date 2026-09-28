// Fase 7 — bloco visual de resultado: texto, pontuação, percentual, gráfico e confete.
import { useEffect, useRef } from "react";
import {
  DEFAULT_RESULT_DESCRIPTION,
  DEFAULT_RESULT_TITLE,
  fillPlaceholders,
  matchRange,
  type ResultRange,
} from "@/lib/quiz-result";
import type { QuizElement, QuizSettings } from "@/lib/quiz-types";

function BarChart({ percent, settings }: { percent: number; settings: QuizSettings }) {
  return (
    <div className="w-full">
      <div
        style={{
          height: 14,
          borderRadius: 999,
          backgroundColor: `${settings.colors.text}1A`,
          overflow: "hidden",
        }}
      >
        <div
          className="quiz-result-bar"
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${settings.colors.primary}, ${settings.colors.secondary})`,
          }}
        />
      </div>
    </div>
  );
}

function CircleChart({ percent, settings }: { percent: number; settings: QuizSettings }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const gid = `qg-${settings.colors.primary.replace("#", "")}`;
  return (
    <div className="relative mx-auto" style={{ width: 140, height: 140 }}>
      <svg viewBox="0 0 120 120" width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={settings.colors.primary} />
            <stop offset="100%" stopColor={settings.colors.secondary} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke={`${settings.colors.text}1A`} strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          style={{ transition: "stroke-dashoffset .9s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-2xl font-bold">{percent}%</div>
    </div>
  );
}

/** Confete leve em canvas, sem bibliotecas; respeita prefers-reduced-motion. */
export function Confetti({ colors }: { colors: string[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);
    const parts = Array.from({ length: 110 }, () => ({
      x: Math.random() * w,
      y: -20 - Math.random() * h * 0.5,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2 + Math.random() * 3,
      s: 4 + Math.random() * 5,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const fade = Math.max(0, 1 - (t - start - 2200) / 800);
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (fade > 0) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [colors]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full" />;
}

export function ResultBlockView({
  el,
  settings,
  score,
  percent,
  hasScoring,
}: {
  el: QuizElement;
  settings: QuizSettings;
  score: number;
  /** null quando não há pontuação máxima válida. */
  percent: number | null;
  hasScoring: boolean;
}) {
  const ct = el.content as Record<string, any>;
  const st = el.settings as Record<string, any>;
  const range = matchRange(ct.ranges as ResultRange[] | undefined, score);
  const rp = range?.percent;
  const pct =
    rp !== null && rp !== undefined && Number.isFinite(Number(rp))
      ? Math.min(100, Math.max(0, Math.round(Number(rp))))
      : percent;

  const title = range?.title?.trim() || String(ct.title ?? "").trim() || DEFAULT_RESULT_TITLE;
  const description =
    range?.description?.trim() || String(ct.description ?? "").trim() || (range ? "" : DEFAULT_RESULT_DESCRIPTION);
  const image = range?.image?.trim() || String(ct.image ?? "").trim();
  const subtitle = String(ct.subtitle ?? "").trim();
  const f = (t: string) => fillPlaceholders(t, score, pct);
  const chart = pct === null ? "none" : String(st.chart ?? "bar");
  const suffix = String(st.scoreSuffix ?? "pontos");

  return (
    <div className="flex w-full flex-col items-center gap-3 text-center animate-fade-in">
      <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{f(title)}</h2>
      {subtitle && <p style={{ fontSize: 15, opacity: 0.75 }}>{f(subtitle)}</p>}
      {image && (
        <img src={image} alt="" loading="lazy" className="max-h-64 w-full rounded-2xl object-cover" />
      )}
      {st.showScore !== false && hasScoring && (
        <div style={{ fontSize: 34, fontWeight: 800, color: settings.colors.secondary }}>
          {score} {suffix}
        </div>
      )}
      {chart === "circle" && pct !== null && <CircleChart percent={pct} settings={settings} />}
      {chart === "bar" && pct !== null && <BarChart percent={pct} settings={settings} />}
      {st.showPercent !== false && pct !== null && chart !== "circle" && (
        <div style={{ fontSize: 20, fontWeight: 700 }}>{pct}%</div>
      )}
      {description && (
        <p className="whitespace-pre-line" style={{ fontSize: 16, opacity: 0.9 }}>
          {f(description)}
        </p>
      )}
    </div>
  );
}
