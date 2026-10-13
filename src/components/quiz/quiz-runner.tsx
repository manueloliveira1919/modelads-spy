// Motor de execução do quiz (Fases 2 e 3).
// Renderiza uma seção por vez, guarda respostas na sessão local, controla a navegação
// e — no modo "live" — grava o lead da seção de captura e executa o CTA do resultado.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  answerKey,
  newSession,
  type OptionsAnswer,
  type QuizSessionState,
} from "@/lib/quiz-session";
import { ctaHref, isValidEmail, isValidPhone, readCta, storablePhone } from "@/lib/quiz-conversion";
import { submitQuizLead } from "@/lib/quiz-public";
import { resolveNextIndex } from "@/lib/quiz-logic";
import {
  QuizFonts,
  QuizElementView,
  QuizProgress as ProgressBar,
  QuizPrimaryButton as PrimaryButton,
  quizSurfaceStyle,
} from "@/components/quiz/quiz-element-view";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/quiz/quiz-result-view";
import { computeMaxScore, computePercent, computeScore } from "@/lib/quiz-result";
import type { QuizElement, QuizSection, QuizSettings } from "@/lib/quiz-types";

type Sx = Record<string, string | number | boolean | undefined>;

export type RunnerDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<RunnerDevice, number> = {
  desktop: 900,
  tablet: 680,
  mobile: 380,
};

export function QuizRunner({
  sections,
  settings,
  quizId,
  device = "mobile",
  mode = "preview",
  fullScreen = false,
  onExit,
  className,
}: {
  sections: QuizSection[];
  settings: QuizSettings;
  quizId: string;
  device?: RunnerDevice;
  /** "live" grava leads reais; "preview" não toca no banco. */
  mode?: "preview" | "live";
  fullScreen?: boolean;
  onExit?: () => void;
  className?: string;
}) {
  const [session, setSession] = useState<QuizSessionState>(() => newSession(quizId));
  const [error, setError] = useState<string | null>(null);
  const [anim, setAnim] = useState<"in" | "out">("in");
  const [saving, setSaving] = useState(false);

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
        setSession((s) => {
          const last = Math.max(0, total - 1);
          const cur = Math.min(s.current_section, last);
          const history = s.history ?? [];
          if (delta === -1) {
            // Volta para a seção realmente visitada antes (histórico real).
            if (history.length) {
              return {
                ...s,
                current_section: history[history.length - 1],
                history: history.slice(0, -1),
              };
            }
            return { ...s, current_section: Math.max(cur - 1, 0) };
          }
          const target = Math.min(Math.max(resolveNextIndex(sections, cur, s.answers), 0), last);
          if (target === cur) return s;
          return { ...s, current_section: target, history: [...history, cur] };
        });
        setAnim("in");
      }, 120);
    },
    [total, sections],
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
      const st = el.settings as Sx;

      if (el.type === "options") {
        if (st.required === false) continue;
        const ans = session.answers[answerKey(section.id, el.id)] as OptionsAnswer | undefined;
        if (!ans || ans.optionIds.length === 0) {
          setError("Escolha pelo menos uma opção para continuar.");
          return false;
        }
      }

      if (el.type === "fields") {
        const ans = session.answers[answerKey(section.id, el.id)];
        const values = ans && ans.type === "fields" ? ans.values : {};
        const fields = (el.content.fields ?? []) as {
          key: string;
          label: string;
          enabled: boolean;
          required?: boolean;
        }[];
        for (const f of fields) {
          if (!f.enabled) continue;
          const raw = (values[f.key] ?? "").trim();
          const required = f.required !== false;
          if (required && !raw) {
            setError(`Preencha o campo ${f.label}.`);
            return false;
          }
          if (!raw) continue;
          if (f.key === "email" && !isValidEmail(raw)) {
            setError("Informe um e-mail válido.");
            return false;
          }
          if (f.key === "whatsapp" && !isValidPhone(raw)) {
            setError("Informe um WhatsApp válido com DDD.");
            return false;
          }
        }
      }
    }
    return true;
  }, [section, session.answers]);

  const captureElement = useMemo(
    () => section?.elements.find((e) => e.type === "fields") ?? null,
    [section],
  );

  const advance = useCallback(async () => {
    if (saving) return;
    if (!validate()) return;

    if (mode === "live" && section && captureElement) {
      const ans = session.answers[answerKey(section.id, captureElement.id)];
      const values = ans && ans.type === "fields" ? ans.values : {};
      const hasAny = Object.values(values).some((v) => (v ?? "").trim().length > 0);
      if (hasAny) {
        setSaving(true);
        try {
          await submitQuizLead({
            quizId,
            sessionId: session.session_id,
            name: values.name?.trim() || undefined,
            email: values.email?.trim() || undefined,
            whatsapp: values.whatsapp ? storablePhone(values.whatsapp) : undefined,
          });
        } catch {
          setSaving(false);
          setError("Não foi possível enviar seus dados. Tente novamente.");
          return;
        }
        setSaving(false);
      }
    }

    if (isLast) return;
    go(1);
  }, [saving, validate, mode, section, captureElement, session, quizId, isLast, go]);

  const runCta = useCallback(
    (el: QuizElement) => {
      const href = ctaHref(readCta(el.settings as Record<string, unknown>));
      if (!href) {
        void advance();
        return;
      }
      if (mode !== "live") {
        setError("Pré-visualização: o botão abriria " + href);
        return;
      }
      const target = (el.settings as Sx).ctaTarget === "_self" ? "_self" : "_blank";
      window.open(href, target, target === "_blank" ? "noopener,noreferrer" : undefined);
    },
    [advance, mode],
  );

  const maxScore = useMemo(() => computeMaxScore(sections), [sections]);
  // Fase 7: soma somente seções efetivamente visitadas (histórico + atual).
  const score = useMemo(() => {
    const visited = new Set([...(session.history ?? []), session.current_section]);
    return computeScore(
      sections.filter((_, i) => visited.has(i)),
      session.answers,
    );
  }, [sections, session.answers, session.history, session.current_section]);
  const resultPercent = computePercent(score, maxScore);
  const showConfetti = !!section?.elements.some(
    (e) => e.type === "result" && (e.settings as Sx).confetti !== false,
  );
  const [readyResults, setReadyResults] = useState<Set<string>>(() => new Set());
  const resultReady = !!section?.elements.some(e => e.type === "result" && readyResults.has(`${session.session_id}-${section.id}-${e.id}`));
  const allElements = useMemo(() => sections.flatMap(s => s.elements), [sections]);

  // Confete uma única vez por conclusão (sessão); Voltar/avançar de novo não repete.
  const confettiFiredRef = useRef<Set<string>>(new Set());
  const [confettiKey, setConfettiKey] = useState<string | null>(null);
  useEffect(() => {
    if (!showConfetti || !section || !resultReady) {
      setConfettiKey(null);
      return;
    }
    if (confettiFiredRef.current.has(session.session_id)) return;
    confettiFiredRef.current.add(session.session_id);
    setConfettiKey(`${session.session_id}-${section.id}`);
  }, [showConfetti, resultReady, section, session.session_id]);

  const hasButton = useMemo(() => !!section?.elements.some((e) => e.type === "button"), [section]);

  if (!section) {
    return (
      <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
        Este quiz ainda não tem seções.
      </div>
    );
  }

  const renderElement = (el: QuizElement) => {
    const ans = session.answers[answerKey(section.id, el.id)];
    return (
      <QuizElementView
        key={el.id}
        el={el}
        settings={settings}
        percent={percent}
        selectedOptions={ans?.type === "options" ? ans.optionIds : []}
        onOptionsChange={(ids) => setOptions(section.id, el.id, ids)}
        fieldValues={ans?.type === "fields" ? ans.values : {}}
        onFieldChange={(key, value) => setField(section.id, el.id, key, value)}
        onAction={() => runCta(el)}
        loading={saving}
        score={score}
        resultPercent={resultPercent}
        hasScoring={maxScore > 0}
        onResultReady={() => setReadyResults(prev => { const key = `${session.session_id}-${section.id}-${el.id}`; if (prev.has(key)) return prev; return new Set([...prev, key]); })}
      />
    );
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-3",
        fullScreen && "min-h-[100dvh] justify-center px-0 py-0",
        className,
      )}
      style={fullScreen ? quizSurfaceStyle(settings) : undefined}
    >
      <div
        className={cn(
          "q-surface w-full",
          fullScreen
            ? "min-h-[100dvh]"
            : "overflow-hidden rounded-2xl border border-border shadow-2xl",
          "relative",
        )}
        style={
          fullScreen
            ? quizSurfaceStyle(settings)
            : { maxWidth: DEVICE_WIDTH[device], ...quizSurfaceStyle(settings) }
        }
      >
        {showConfetti && confettiKey === `${session.session_id}-${section.id}` && (
          <Confetti
            key={confettiKey}
            colors={[
              settings.colors.primary,
              settings.colors.secondary,
              "#FFD166",
              "#EF476F",
              "#06D6A0",
            ]}
          />
        )}
        <div
          className="q-card mx-auto flex min-h-[460px] w-full flex-col"
          style={{
            maxWidth: settings.layout.contentWidth,

            fontFamily: `${settings.font}, system-ui, sans-serif`,
            color: settings.colors.text,
          }}
        >
          <div className="q-step-header">
            {index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="q-back"
                aria-label="Voltar"
                onClick={() => go(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>
              Etapa {index + 1} de {total}
            </span>
          </div>
          {settings.progress.enabled && (
            <div className="mb-6 w-full">
              <ProgressBar settings={settings} percent={percent} />
            </div>
          )}

          <QuizFonts settings={settings} elements={allElements} />
          <div
            key={section.id}
            className={cn(
              "q-section-entry flex w-full flex-1 flex-col justify-center transition-all duration-150",
              anim === "in" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
            style={{ gap: settings.layout.spacing }}
          >
            {section.elements.map(renderElement)}

            {error && (
              <div role="alert" className="q-error rounded-xl px-4 py-3 text-center text-sm">
                {error}
              </div>
            )}

            {/* Botão padrão quando a seção não tem botão e a navegação precisa continuar */}
            {!hasButton && !isLast && (
              <PrimaryButton
                label="Continuar"
                settings={settings}
                loading={saving}
                onClick={() => void advance()}
              />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <span />
            <Button
              variant="ghost"
              onClick={restart}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: `${settings.colors.text}77` }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
            </Button>
          </div>
        </div>
      </div>

      {!fullScreen && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Etapa {index + 1} de {total}
          </span>
          {onExit && (
            <Button variant="link" onClick={onExit} className="underline">
              Fechar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
