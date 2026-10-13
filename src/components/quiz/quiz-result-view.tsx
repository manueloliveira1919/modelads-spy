// Fase 7 — bloco visual de resultado: texto, pontuação, percentual, gráfico e confete.
import { useEffect, useRef, useState, useId } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/quiz-types";
import { normalizeRuns } from "@/lib/quiz-rich-text";
import {
  DEFAULT_RESULT_DESCRIPTION,
  DEFAULT_RESULT_TITLE,
  fillPlaceholders,
  matchRange,
  type ResultRange,
} from "@/lib/quiz-result";
import type { QuizElement, QuizSettings } from "@/lib/quiz-types";
import { animationClass, animationStyle, textVisualStyle } from "@/lib/quiz-visual";
import { EditableText } from "@/components/quiz/quiz-editable-text";
import { cn } from "@/lib/utils";

/** Partes de texto do bloco Resultado que usam o sistema visual da Fase 5. */
export const RESULT_TEXT_PARTS = {
  title: { label: "Título do resultado", size: 28, weight: 700 },
  subtitle: { label: "Subtítulo do resultado", size: 15, weight: 400 },
  score: { label: "Pontuação", size: 34, weight: 800 },
  percent: { label: "Percentual", size: 20, weight: 700 },
  description: { label: "Descrição do resultado", size: 16, weight: 400 },
} as const;
export type ResultTextPart = keyof typeof RESULT_TEXT_PARTS;

/** Estilos por parte ficam em settings.styles[part] (mesmo formato dos elementos de texto). */
export function resultPartSettings(st: Record<string, any>, part: string): Record<string, unknown> {
  return ((st.styles ?? {}) as Record<string, Record<string, unknown>>)[part] ?? {};
}

export interface ResultEditorHooks {
  selectedPart: string | null;
  onSelectPart: (part: string) => void;
  onTextChange?: (patch: Record<string, unknown>) => void;
}

function BarChart({ percent, settings }: { percent: number; settings: QuizSettings }) {
  return (
    <div className="w-full">
      <div
        style={{
          height: 18,
          borderRadius: 999,
          backgroundColor: "var(--q-line)",
          overflow: "hidden",
        }}
      >
        <div
          className="quiz-result-bar"
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg,var(--q-primary),var(--q-secondary))",
          }}
        />
      </div>
    </div>
  );
}

function CircleChart({ percent, settings }: { percent: number; settings: QuizSettings }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const gid = useId();
  return (
    <div className="relative mx-auto" style={{ width: 140, height: 140 }}>
      <svg viewBox="0 0 120 120" width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={settings.colors.primary} />
            <stop offset="100%" stopColor={settings.colors.secondary} />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={`${settings.colors.text}1A`}
          strokeWidth="10"
        />
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
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}

type ResultItem = { id: string; label: string; value?: number; followScore?: boolean };
function clamp(value: unknown) { const n = Number(value); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0; }
function useMotionProgress(duration: number, delay: number, enabled: boolean, initial: number) {
  const [progress, setProgress] = useState(initial);
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setProgress(1); return; }
    setProgress(0); let raf = 0; const start = performance.now() + delay;
    const tick = (now: number) => { const next = Math.min(1, Math.max(0, (now - start) / duration)); setProgress(next); if (next < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [duration, delay, enabled]);
  return progress;
}
function Indicator({ item, target, index, animate, editable, onChange, onRemove }: { item: ResultItem; target: number; index: number; animate: boolean; editable: boolean; onChange: (label: string) => void; onRemove: () => void }) {
  const p = useMotionProgress(800, index * 450, animate, animate ? 0 : 1);
  const value = Math.round(target * p);
  return <div className="q-result-indicator"><div className="flex items-center gap-2"><EditableText value={item.label} editable={editable} onChange={onChange} className="min-w-0 flex-1 text-left" /><strong>{value}%</strong>{editable && <Button variant="ghost" size="icon" aria-label="Remover indicador" onClick={onRemove}><X className="h-3 w-3" /></Button>}</div><BarChart percent={value} settings={{ colors: {} } as QuizSettings} /></div>;
}
export function ResultBlockView({ el, settings, score, percent, hasScoring, editor, animationKey = 0, onReady }: {
  el: QuizElement; settings: QuizSettings; score: number; percent: number | null; hasScoring: boolean; editor?: ResultEditorHooks; animationKey?: number; onReady?: () => void;
}) {
  // An animation preview remounts this presentation only, never the quiz session.
  return <ResultPresentation key={`${el.id}-${animationKey}`} el={el} settings={settings} score={score} percent={percent} hasScoring={hasScoring} editor={editor} previewAnimation={animationKey > 0} onReady={onReady} />;
}
function ResultPresentation({ el, settings, score, percent, hasScoring, editor, previewAnimation, onReady }: { el: QuizElement; settings: QuizSettings; score: number; percent: number | null; hasScoring: boolean; editor?: ResultEditorHooks; previewAnimation: boolean; onReady?: () => void }) {
  const ct = el.content as Record<string, any>, st = el.settings as Record<string, any>;
  const playing = !editor || previewAnimation;
  const duration = [3, 5, 8].includes(Number(st.loadingSeconds)) ? Number(st.loadingSeconds) * 1000 : 5000;
  const loading = playing && st.loading === true;
  const loadingProgress = useMotionProgress(duration, 0, loading, loading ? 0 : 1);
  const ready = !loading || loadingProgress >= 1;
  const count = useMotionProgress(1000, 0, playing && ready, playing ? 0 : 1);
  const readyCallback = useRef(onReady); readyCallback.current = onReady;
  useEffect(() => { if (ready && playing) readyCallback.current?.(); }, [ready, playing]);
  const range = matchRange(ct.ranges as ResultRange[] | undefined, score);
  const rp = range?.percent;
  const pct = rp !== null && rp !== undefined && Number.isFinite(Number(rp)) ? Math.round(clamp(rp)) : percent;
  const f = (t: string) => fillPlaceholders(t, score, pct);
  const title = editor ? String(ct.title ?? "") : range?.title?.trim() || String(ct.title ?? "").trim() || DEFAULT_RESULT_TITLE;
  const description = editor ? String(ct.description ?? "") : range?.description?.trim() || String(ct.description ?? "").trim() || (range ? "" : DEFAULT_RESULT_DESCRIPTION);
  const image = (editor ? "" : range?.image?.trim()) || String(ct.image ?? "").trim();
  const chart = pct === null ? "none" : String(st.chart ?? "bar");
  const setCt = (patch: Record<string, unknown>) => editor?.onTextChange?.(patch);
  const editable = !!editor && !previewAnimation;
  const part = (key: ResultTextPart, text: string, field?: "title" | "subtitle" | "description", extra?: React.CSSProperties) => {
    const ps = { ...st, ...resultPartSettings(st, key) }, def = RESULT_TEXT_PARTS[key];
    // A matching range's text must never borrow default-content runs.
    const runs = field && !(range && !editor && ((field === "title" && range.title?.trim()) || (field === "description" && range.description?.trim()))) ? normalizeRuns(ct[`${field}Runs`]).map(r => ({ ...r, t: editor ? r.t : f(r.t) })) : undefined;
    return <div key={key} data-result-part={key} className={cn("w-full min-w-0", animationClass(ps))} style={animationStyle(ps)}><EditableText as={key === "title" ? "h2" : "p"} value={editor ? text : f(text)} runs={runs} editable={!!field && editable} onChange={(v, r) => field && setCt({ [field]: v, [`${field}Runs`]: r })} className="whitespace-pre-line" style={{ ...textVisualStyle(ps, settings, def.size, def.weight), ...extra }} /></div>;
  };
  const steps = Array.isArray(ct.loadingSteps) && ct.loadingSteps.length ? ct.loadingSteps as ResultItem[] : [{ id: "1", label: "Analisando suas respostas" }, { id: "2", label: "Calculando seu perfil" }, { id: "3", label: "Preparando seu resultado" }];
  const bars = (Array.isArray(ct.bars) ? ct.bars : []) as ResultItem[];
  const checklist = (Array.isArray(ct.checklist) ? ct.checklist : []) as ResultItem[];
  const listChange = (key: string, list: ResultItem[], id: string, patch: Partial<ResultItem>) => setCt({ [key]: list.map(x => x.id === id ? { ...x, ...patch } : x) });
  const editLoading = editable && st.loading === true;
  return <div className="q-result-shell">
    {(!ready || editLoading) && <div className="q-result-analysis" role={!ready ? "status" : undefined}>
      <EditableText as="h2" value={String(ct.loadingTitle || "Analisando suas respostas...")} editable={editable} onChange={v => setCt({ loadingTitle: v })} />
      {steps.map((item, i) => <div key={item.id} className="q-result-indicator"><div className="flex items-center gap-2"><EditableText value={item.label} editable={editable} onChange={label => listChange("loadingSteps", steps, item.id, { label })} className="flex-1 text-left" /><strong>{Math.round(clamp((loadingProgress * steps.length - i) * 100))}%</strong>{editable && <Button variant="ghost" size="icon" aria-label="Remover etapa de análise" onClick={() => setCt({ loadingSteps: steps.filter(x => x.id !== item.id) })}><X className="h-3 w-3" /></Button>}</div><BarChart percent={clamp((loadingProgress * steps.length - i) * 100)} settings={settings} /></div>)}
      {editable && <Button variant="ghost" className="q-add" onClick={() => setCt({ loadingSteps: [...steps, { id: uid(), label: "Nova etapa" }] })}><Plus className="h-3 w-3" />Adicionar etapa</Button>}
    </div>}
    {ready && <div className={cn("q-result flex w-full flex-col items-center gap-4 text-center", playing && "q-result-reveal")}>
      {editor && previewAnimation && st.confetti !== false && <Confetti colors={[settings.colors.primary, settings.colors.secondary]} />}
      {st.showBadge === true && <EditableText value={String(ct.badge || "PERFIL AVANÇADO")} editable={editable} className="q-result-badge" onChange={v => setCt({ badge: v })} />}
      {(title || editor) && part("title", title || DEFAULT_RESULT_TITLE, "title")}
      {(ct.subtitle || editor) && part("subtitle", String(ct.subtitle || ""), "subtitle")}
      {image && <img src={image} alt="" loading="lazy" className="q-media max-h-64 w-full rounded-2xl object-cover" />}
      {st.showScore !== false && hasScoring && part("score", `${Math.round(score * count)} ${String(st.scoreSuffix ?? "pontos")}`, undefined, { color: settings.colors.secondary })}
      {chart === "circle" && pct !== null && <CircleChart percent={Math.round(pct * count)} settings={settings} />}
      {chart === "bar" && pct !== null && <BarChart percent={Math.round(pct * count)} settings={settings} />}
      {st.showPercent !== false && pct !== null && chart !== "circle" && part("percent", `${Math.round(pct * count)}%`)}
      {(description || editor) && part("description", description, "description")}
      {st.showBars === true && <div className="q-result-list">{bars.map((item, i) => <Indicator key={`${item.id}-${ready}`} item={item} target={item.followScore ? pct ?? 0 : clamp(item.value)} index={i} animate={playing && ready} editable={editable} onChange={label => listChange("bars", bars, item.id, { label })} onRemove={() => setCt({ bars: bars.filter(x => x.id !== item.id) })} />)}{editable && <Button variant="ghost" className="q-add" onClick={() => setCt({ bars: [...bars, { id: uid(), label: "Novo indicador", value: 50, followScore: false }] })}><Plus className="h-3 w-3" />Adicionar indicador</Button>}</div>}
      {st.showChecklist === true && <div className="q-result-list">{checklist.map(item => <div key={item.id} className="flex items-center gap-3"><Check className="q-result-check h-5 w-5 shrink-0" /><EditableText value={editor ? item.label : f(item.label)} editable={editable} className="min-w-0 flex-1 text-left" onChange={label => listChange("checklist", checklist, item.id, { label })} />{editable && <Button variant="ghost" size="icon" aria-label="Remover destaque" onClick={() => setCt({ checklist: checklist.filter(x => x.id !== item.id) })}><X className="h-3 w-3" /></Button>}</div>)}{editable && <Button variant="ghost" className="q-add" onClick={() => setCt({ checklist: [...checklist, { id: uid(), label: "Novo destaque" }] })}><Plus className="h-3 w-3" />Adicionar destaque</Button>}</div>}
    </div>}
  </div>;
}
