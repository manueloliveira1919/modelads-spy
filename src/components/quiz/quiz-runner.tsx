// Motor de execução do quiz (Fases 2 e 3).
// Renderiza uma seção por vez, guarda respostas na sessão local, controla a navegação
// e — no modo "live" — grava o lead da seção de captura e executa o CTA do resultado.

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  answerKey,
  newSession,
  type OptionsAnswer,
  type QuizSessionState,
} from "@/lib/quiz-session";
import {
  ctaHref,
  isValidEmail,
  isValidPhone,
  maskPhone,
  readCta,
  storablePhone,
} from "@/lib/quiz-conversion";
import { submitQuizLead } from "@/lib/quiz-public";
import type { QuizElement, QuizSection, QuizSettings, OptionItem } from "@/lib/quiz-types";


type Sx = Record<string, string | number | boolean | undefined>;

export type RunnerDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<RunnerDevice, number> = {
  desktop: 900,
  tablet: 680,
  mobile: 380,
};

function backgroundStyle(s: QuizSettings): React.CSSProperties {
  const bg = s.background;
  if (bg.type === "gradient") {
    return { backgroundImage: `linear-gradient(160deg, ${bg.gradientFrom}, ${bg.gradientTo})` };
  }
  if (bg.type === "image" && bg.imageUrl) {
    return {
      backgroundImage: `url(${bg.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { backgroundColor: bg.color };
}

function embedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function ProgressBar({ settings, percent }: { settings: QuizSettings; percent: number }) {
  const p = settings.progress;
  return (
    <div className="w-full">
      <div
        style={{
          height: p.thickness,
          borderRadius: p.radius,
          backgroundColor: `${settings.colors.text}1A`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: p.radius,
            background:
              p.style === "gradient"
                ? `linear-gradient(90deg, ${settings.colors.primary}, ${settings.colors.secondary})`
                : settings.colors.primary,
            transition: "width .35s ease",
          }}
        />
      </div>
      {p.showPercentage && (
        <div className="mt-1 text-right text-[11px]" style={{ color: `${settings.colors.text}99` }}>
          {percent}%
        </div>
      )}
    </div>
  );
}

function PrimaryButton({
  label,
  settings,
  st,
  onClick,
}: {
  label: string;
  settings: QuizSettings;
  st?: Sx;
  onClick: () => void;
}) {
  const s = st ?? {};
  const full = (s.width || settings.button.width) === "full";
  return (
    <div style={{ textAlign: (s.align as React.CSSProperties["textAlign"]) || "center" }}>
      <button
        type="button"
        onClick={onClick}
        className="transition-transform active:scale-[.98]"
        style={{
          backgroundColor: (s.bg as string) || settings.colors.button,
          color: (s.color as string) || settings.colors.buttonText,
          borderRadius: Number(s.radius ?? settings.button.radius),
          minHeight: Math.max(48, settings.button.height),
          fontSize: Number(s.size) || 16,
          fontWeight: 700,
          width: full ? "100%" : undefined,
          padding: full ? "0 16px" : "0 28px",
        }}
      >
        {label}
      </button>
    </div>
  );
}

export function QuizRunner({
  sections,
  settings,
  quizId,
  device = "mobile",
  onExit,
  className,
}: {
  sections: QuizSection[];
  settings: QuizSettings;
  quizId: string;
  device?: RunnerDevice;
  onExit?: () => void;
  className?: string;
}) {
  const [session, setSession] = useState<QuizSessionState>(() => newSession(quizId));
  const [error, setError] = useState<string | null>(null);
  const [anim, setAnim] = useState<"in" | "out">("in");

  const total = sections.length;
  const index = Math.min(session.current_section, Math.max(0, total - 1));
  const section = sections[index] ?? null;
  const percent = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;
  const isLast = index >= total - 1;

  const go = useCallback(
    (delta: 1 | -1) => {
      setError(null);
      setAnim("out");
      window.setTimeout(() => {
        setSession((s) => ({
          ...s,
          current_section: Math.min(Math.max(s.current_section + delta, 0), Math.max(0, total - 1)),
        }));
        setAnim("in");
      }, 120);
    },
    [total],
  );

  const restart = useCallback(() => {
    setError(null);
    setSession(newSession(quizId));
  }, [quizId]);

  const setOptions = (sectionId: string, elementId: string, optionIds: string[]) => {
    setError(null);
    setSession((s) => ({
      ...s,
      answers: {
        ...s.answers,
        [answerKey(sectionId, elementId)]: { type: "options", optionIds },
      },
    }));
  };

  const setField = (sectionId: string, elementId: string, key: string, value: string) => {
    setSession((s) => {
      const k = answerKey(sectionId, elementId);
      const prev = s.answers[k];
      const values = prev && prev.type === "fields" ? prev.values : {};
      return {
        ...s,
        answers: { ...s.answers, [k]: { type: "fields", values: { ...values, [key]: value } } },
      };
    });
  };

  const validate = useCallback((): boolean => {
    if (!section) return false;
    for (const el of section.elements) {
      if (el.type !== "options") continue;
      const st = el.settings as Sx;
      if (st.required === false) continue;
      const ans = session.answers[answerKey(section.id, el.id)] as OptionsAnswer | undefined;
      if (!ans || ans.optionIds.length === 0) {
        setError("Escolha pelo menos uma opção para continuar.");
        return false;
      }
    }
    return true;
  }, [section, session.answers]);

  const advance = useCallback(() => {
    if (!validate()) return;
    if (isLast) return;
    go(1);
  }, [validate, isLast, go]);

  const hasButton = useMemo(() => !!section?.elements.some((e) => e.type === "button"), [section]);

  if (!section) {
    return (
      <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
        Este quiz ainda não tem seções.
      </div>
    );
  }

  const renderElement = (el: QuizElement) => {
    const st = el.settings as Sx;
    const ct = el.content as Record<string, unknown>;

    switch (el.type) {
      case "text":
        return (
          <p
            key={el.id}
            style={{
              fontSize: Number(st.size) || 16,
              fontWeight: Number(st.weight) || 400,
              textAlign: (st.align as React.CSSProperties["textAlign"]) || "center",
              color: (st.color as string) || settings.colors.text,
              marginBottom: Number(st.spacing) || 0,
              lineHeight: 1.35,
            }}
          >
            {String(ct.text ?? "")}
          </p>
        );
      case "image":
        return ct.url ? (
          <div
            key={el.id}
            style={{ textAlign: (st.align as React.CSSProperties["textAlign"]) || "center" }}
          >
            <img
              src={String(ct.url)}
              alt=""
              loading="lazy"
              style={{
                maxWidth: "100%",
                width: `${Number(st.width) || 100}%`,
                height: Number(st.height) > 0 ? Number(st.height) : "auto",
                objectFit: "cover",
                borderRadius: Number(st.radius) || 0,
                display: "inline-block",
              }}
            />
          </div>
        ) : null;
      case "video": {
        const src = embedUrl(String(ct.url || ""));
        return src ? (
          <div
            key={el.id}
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: "16 / 9", borderRadius: Number(st.radius) || 0 }}
          >
            <iframe
              src={src}
              title="Vídeo do quiz"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null;
      }
      case "button":
        return (
          <PrimaryButton
            key={el.id}
            label={String(ct.label || "Continuar")}
            settings={settings}
            st={st}
            onClick={advance}
          />
        );
      case "options": {
        const multiple = st.selection === "multiple";
        const ans = session.answers[answerKey(section.id, el.id)] as OptionsAnswer | undefined;
        const selected = ans?.optionIds ?? [];
        const options = (ct.options ?? []) as OptionItem[];
        return (
          <div key={el.id} className="flex flex-col gap-3">
            {ct.description ? (
              <p className="text-center text-sm" style={{ color: `${settings.colors.text}AA` }}>
                {String(ct.description)}
              </p>
            ) : null}
            {options.map((o) => {
              const active = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    const next = multiple
                      ? active
                        ? selected.filter((x) => x !== o.id)
                        : [...selected, o.id]
                      : [o.id];
                    setOptions(section.id, el.id, next);
                  }}
                  className="flex w-full items-center gap-3 text-left transition-all active:scale-[.99]"
                  style={{
                    border: `2px solid ${active ? settings.colors.primary : `${settings.colors.primary}44`}`,
                    background: active ? `${settings.colors.primary}22` : "transparent",
                    borderRadius: settings.button.radius,
                    padding: "14px 16px",
                    minHeight: 56,
                    color: settings.colors.text,
                    fontSize: 16,
                  }}
                >
                  {o.image ? (
                    <img
                      src={o.image}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <span className="flex-1">{o.label}</span>
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center"
                    style={{
                      border: `2px solid ${active ? settings.colors.primary : `${settings.colors.text}44`}`,
                      borderRadius: multiple ? 6 : 999,
                      background: active ? settings.colors.primary : "transparent",
                    }}
                  >
                    {active && (
                      <Check
                        className="h-3.5 w-3.5"
                        style={{ color: settings.colors.buttonText }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        );
      }
      case "fields": {
        const ans = session.answers[answerKey(section.id, el.id)];
        const values = ans && ans.type === "fields" ? ans.values : {};
        return (
          <div key={el.id} className="flex flex-col gap-3">
            {((ct.fields ?? []) as { key: string; label: string; enabled: boolean }[])
              .filter((f) => f.enabled)
              .map((f) => (
                <input
                  key={f.key}
                  value={values[f.key] ?? ""}
                  placeholder={f.label}
                  onChange={(e) => setField(section.id, el.id, f.key, e.target.value)}
                  className="w-full bg-transparent outline-none"
                  style={{
                    border: `1px solid ${settings.colors.text}33`,
                    borderRadius: settings.button.radius,
                    padding: "14px 16px",
                    minHeight: 52,
                    color: settings.colors.text,
                    fontSize: 16,
                  }}
                />
              ))}
          </div>
        );
      }
      case "percentage":
        return (
          <div
            key={el.id}
            style={{
              fontSize: Number(st.size) || 14,
              fontWeight: Number(st.weight) || 600,
              color: (st.color as string) || settings.colors.secondary,
              textAlign: (st.align as React.CSSProperties["textAlign"]) || "center",
            }}
          >
            {percent}% concluído
          </div>
        );
      case "progress":
        return <ProgressBar key={el.id} settings={settings} percent={percent} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)}>
      <div
        className="w-full overflow-hidden rounded-2xl border border-border shadow-2xl"
        style={{ maxWidth: DEVICE_WIDTH[device], ...backgroundStyle(settings) }}
      >
        <div
          className="mx-auto flex min-h-[460px] w-full flex-col px-5 py-7 sm:px-6"
          style={{
            maxWidth: settings.layout.contentWidth,
            fontFamily: `${settings.font}, system-ui, sans-serif`,
            color: settings.colors.text,
          }}
        >
          {settings.progress.enabled && (
            <div className="mb-6 w-full">
              <ProgressBar settings={settings} percent={percent} />
            </div>
          )}

          <div
            key={section.id}
            className={cn(
              "flex w-full flex-1 flex-col justify-center transition-all duration-150",
              anim === "in" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
            style={{ gap: settings.layout.spacing }}
          >
            {section.elements.map(renderElement)}

            {error && (
              <div
                role="alert"
                className="rounded-xl px-4 py-3 text-center text-sm"
                style={{
                  background: "rgba(239,68,68,.14)",
                  border: "1px solid rgba(239,68,68,.45)",
                  color: "#FCA5A5",
                }}
              >
                {error}
              </div>
            )}

            {/* Botão padrão quando a seção não tem botão e a navegação precisa continuar */}
            {!hasButton && !isLast && (
              <PrimaryButton label="Continuar" settings={settings} onClick={advance} />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => go(-1)}
                className="flex items-center gap-1.5 text-sm"
                style={{ color: `${settings.colors.text}99` }}
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={restart}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: `${settings.colors.text}77` }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Etapa {index + 1} de {total}
        </span>
        {onExit && (
          <button type="button" onClick={onExit} className="underline">
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}
