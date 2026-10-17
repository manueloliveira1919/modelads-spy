import type { CSSProperties } from "react";
import { ArrowRight, Check, Loader2, Mail, MessageCircle, Plus, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableText } from "./quiz-editable-text";
import { ResultBlockView } from "./quiz-result-view";
import {
  animationClass,
  animationStyle,
  buttonTextVisualStyle,
  textVisualStyle,
  collectQuizFonts,
  quizFontsHref,
  EDITOR_QUIZ_FONTS_HREF,
} from "@/lib/quiz-visual";
import {
  uid,
  type QuizElement,
  type QuizSettings,
  type OptionItem,
  type FieldsContent,
} from "@/lib/quiz-types";
import { maskPhone } from "@/lib/quiz-conversion";
import { cn } from "@/lib/utils";
import { QuizDelayedButton } from "./quiz-delayed-button";
import { quizButtonSettings } from "@/lib/quiz-button";

export function QuizFonts({
  settings,
  elements,
  editor = false,
}: {
  settings: QuizSettings;
  elements: { settings: Record<string, unknown>; content?: Record<string, unknown> }[];
  editor?: boolean;
}) {
  const href = editor ? EDITOR_QUIZ_FONTS_HREF : quizFontsHref(collectQuizFonts(settings, elements));
  return href ? <link rel="stylesheet" href={href} precedence="default" /> : null;
}
export function quizSurfaceStyle(s: QuizSettings): CSSProperties {
  const bg = s.background;
  return {
    "--q-primary": s.colors.primary,
    "--q-secondary": s.colors.secondary,
    "--q-text": s.colors.text,
    "--q-button": s.colors.button,
    "--q-button-text": s.colors.buttonText,
    "--q-radius": `${s.button.radius}px`,
    fontFamily: `${s.font},system-ui,sans-serif`,
    color: s.colors.text,
    backgroundColor: bg.color,
    backgroundImage:
      bg.type === "image" && bg.imageUrl
        ? `url(${bg.imageUrl})`
        : `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${s.colors.primary} 15%, transparent), transparent 65%),linear-gradient(160deg,${bg.type === "gradient" ? bg.gradientFrom : bg.color},${bg.type === "gradient" ? bg.gradientTo : `color-mix(in srgb, ${bg.color} 94%, ${s.colors.primary})`})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;
}
export function QuizProgress({ settings, percent }: { settings: QuizSettings; percent: number }) {
  return (
    <div className="q-progress">
      <div
        style={{
          height: Math.min(6, Math.max(4, settings.progress.thickness)),
          borderRadius: settings.progress.radius,
        }}
      >
        <span
          style={{
            width: `${percent}%`,
            background: settings.progress.style === "solid" ? settings.colors.primary : undefined,
          }}
        />
      </div>
      {settings.progress.showPercentage && <small>{percent}%</small>}
    </div>
  );
}
export function QuizPrimaryButton({
  label,
  settings,
  st = {},
  loading = false,
  onClick,
  editable = false,
  onText,
  runs,
}: {
  label: string;
  settings: QuizSettings;
  st?: Record<string, unknown>;
  loading?: boolean;
  onClick?: () => void;
  editable?: boolean;
  onText?: (v: string, runs: import("@/lib/quiz-rich-text").TextRun[]) => void;
  runs?: unknown;
}) {
  return (
    <div
      className={animationClass(st)}
      style={{
        ...animationStyle(st),
        textAlign: (st.align as CSSProperties["textAlign"]) || "center",
      }}
    >
      <Button
        type="button"
        variant="ghost"
        disabled={loading}
        onClick={editable ? undefined : onClick}
        className="q-primary-button"
        style={{
          ...buttonTextVisualStyle(st, settings),
          backgroundImage: `linear-gradient(110deg,${st.bg || settings.colors.button},${st.bg || settings.colors.secondary})`,
          borderRadius: Number(st.radius ?? settings.button.radius),
          minHeight: Math.max(56, settings.button.height),
          width: (st.width || settings.button.width) === "full" ? "100%" : "auto",
        }}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <EditableText as="span" value={label} runs={runs} editable={editable} onChange={onText} />
        <ArrowRight className="h-5 w-5 shrink-0" />
      </Button>
    </div>
  );
}
export interface QuizElementViewProps {
  el: QuizElement;
  settings: QuizSettings;
  percent: number;
  editable?: boolean;
  onContentChange?: (patch: Record<string, unknown>) => void;
  selectedOptions?: string[];
  onOptionsChange?: (ids: string[]) => void;
  fieldValues?: Record<string, string>;
  onFieldChange?: (key: string, value: string) => void;
  onAction?: () => void;
  loading?: boolean;
  score?: number;
  resultPercent?: number | null;
  hasScoring?: boolean;
  resultAnimationKey?: number;
  onResultReady?: () => void;
  buttonsReady?: boolean;
}
/** Shared visual only: session, navigation, scoring and capture remain in QuizRunner. */
export function QuizElementView({
  el,
  settings,
  percent,
  editable = false,
  onContentChange,
  selectedOptions = [],
  onOptionsChange,
  fieldValues = {},
  onFieldChange,
  onAction,
  loading,
  score = 75,
  resultPercent = 75,
  hasScoring = true,
  resultAnimationKey = 0,
  onResultReady,
  buttonsReady = true,
}: QuizElementViewProps) {
  const st = el.settings,
    ct = el.content;
  const text = (
    key: string,
    value: string,
    props: { as?: "p" | "span" | "h2" | "div"; className?: string; style?: CSSProperties } = {},
  ) => (
    <EditableText
      value={value}
      runs={ct[key === "text" ? "runs" : `${key}Runs`]}
      editable={editable}
      onChange={(v, runs) => onContentChange?.({ [key]: v, [key === "text" ? "runs" : `${key}Runs`]: runs, ...(key !== "text" ? { text: v } : {}) })}
      {...props}
    />
  );
  switch (el.type) {
    case "text":
      return (
        <div
          className={animationClass(st)}
          style={{ ...animationStyle(st), marginBottom: Number(st.spacing) || 0 }}
        >
          {text("text", String(ct.text ?? ""), {
            className: cn("whitespace-pre-line", Number(st.size) < 24 && "q-body-text"),
            style: textVisualStyle(st, settings, 17, 400),
          })}
        </div>
      );
    case "button":
      return (
        <QuizDelayedButton delaySeconds={st.delaySeconds} ready={buttonsReady} editable={editable}>
        <QuizPrimaryButton
          label={String(ct.label || "Continuar")}
          settings={settings}
          st={st}
          loading={loading}
          editable={editable}
          runs={ct.runs}
          onClick={onAction}
          onText={(v, runs) => onContentChange?.({ label: v, text: v, runs })}
        />
        </QuizDelayedButton>
      );
    case "image":
      return ct.url ? (
        <div style={{ textAlign: (st.align as CSSProperties["textAlign"]) || "center" }}>
          <img
            className="q-media"
            src={String(ct.url)}
            alt=""
            loading="lazy"
            style={{
              width: `${Number(st.width) || 100}%`,
              height: Number(st.height) > 0 ? Number(st.height) : "auto",
              borderRadius: Number(st.radius ?? 24),
              display: "inline-block",
            }}
          />
        </div>
      ) : editable ? (
        <div className="q-placeholder">Imagem</div>
      ) : null;
    case "video": {
      const url = String(ct.url || "");
      const yt = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/,
      );
      const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      const src = yt
        ? `https://www.youtube.com/embed/${yt[1]}`
        : vm
          ? `https://player.vimeo.com/video/${vm[1]}`
          : url;
      return src ? (
        <div className="q-video q-media" style={{ borderRadius: Number(st.radius ?? 24) }}>
          {/\.(mp4|webm)(\?|$)/i.test(src) ? (
            <video src={src} controls />
          ) : (
            <iframe
              src={src}
              title="Vídeo do quiz"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
          {editable && <div className="q-video-shield" />}
        </div>
      ) : editable ? (
        <div className="q-placeholder">Vídeo</div>
      ) : null;
    }
    case "options": {
      const options = (ct.options ?? []) as (OptionItem & { emoji?: string })[];
      const update = (id: string, patch: Partial<OptionItem>) =>
        onContentChange?.({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
      return (
        <div className="flex flex-col gap-3">
          {(ct.description || editable) &&
            text("description", String(ct.description ?? ""), {
              className: "q-body-text text-center",
            })}
          {options.map((o) => {
            const active = selectedOptions.includes(o.id);
            const content = (
              <>
                {o.image ? (
                  <img className="q-option-image" src={o.image} alt="" />
                ) : o.emoji ? (
                  <span className="q-option-emoji">{o.emoji}</span>
                ) : null}
                <EditableText
                  as="span"
                  className="min-w-0 flex-1 whitespace-pre-line"
                  value={o.label}
                  runs={o.runs}
                  editable={editable}
                  style={{ ...textVisualStyle(st, settings, 16, 500), textAlign: (st.align as CSSProperties["textAlign"]) || "left" }}
                  onChange={(v, runs) => update(o.id, { label: v, text: v, runs })}
                />
                <span className="q-check" data-multiple={st.selection === "multiple"}>
                  {active && <Check className="h-4 w-4" />}
                </span>
              </>
            );
            return editable ? (
              <div key={o.id} className="q-option group">
                {content}
                <Button
                  className="q-remove-option"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover opção"
                  onClick={() =>
                    onContentChange?.({ options: options.filter((x) => x.id !== o.id) })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                key={o.id}
                variant="ghost"
                className="q-option"
                aria-pressed={active}
                onClick={() =>
                  onOptionsChange?.(
                    st.selection === "multiple"
                      ? active
                        ? selectedOptions.filter((id) => id !== o.id)
                        : [...selectedOptions, o.id]
                      : [o.id],
                  )
                }
              >
                {content}
              </Button>
            );
          })}
          {editable && (
            <Button
              variant="ghost"
              className="q-add"
              onClick={() =>
                onContentChange?.({
                  options: [...options, { id: uid(), label: `Opção ${options.length + 1}` }],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Adicionar opção
            </Button>
          )}
        </div>
      );
    }
    case "fields": {
      const fields = (ct.fields ?? []) as FieldsContent["fields"];
      return (
        <div className="flex flex-col gap-3">
          {fields
            .filter((f) => f.enabled)
            .map((f) => {
              const Icon = f.key === "email" ? Mail : f.key === "name" ? User : MessageCircle;
              return (
                <div key={f.key} className="q-field">
                  <Icon className="h-5 w-5 shrink-0" />
                  {editable ? (
                    <EditableText
                      as="span"
                      className="flex-1"
                      value={f.label}
                      editable
                      onChange={(label) =>
                        onContentChange?.({
                          fields: fields.map((x) => (x.key === f.key ? { ...x, label } : x)),
                        })
                      }
                    />
                  ) : (
                    <input
                      aria-label={f.label}
                      value={fieldValues[f.key] ?? ""}
                      placeholder={`${f.label}${f.required === false ? "" : " *"}`}
                      type={f.key === "email" ? "email" : f.key === "whatsapp" ? "tel" : "text"}
                      inputMode={f.key === "whatsapp" ? "numeric" : undefined}
                      autoComplete={
                        f.key === "email" ? "email" : f.key === "name" ? "name" : "tel-national"
                      }
                      onChange={(e) =>
                        onFieldChange?.(
                          f.key,
                          f.key === "whatsapp" ? maskPhone(e.target.value) : e.target.value,
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
        </div>
      );
    }
    case "progress":
      return <QuizProgress settings={settings} percent={percent} />;
    case "percentage":
      return (
        <p
          style={{
            ...textVisualStyle(st, settings, 14, 600),
            color: String(st.color || settings.colors.secondary),
          }}
        >
          {percent}% concluído
        </p>
      );
    case "result":
      return (
        <ResultBlockView
          el={el}
          settings={settings}
          score={score}
          percent={resultPercent}
          hasScoring={hasScoring}
          animationKey={resultAnimationKey}
          onReady={onResultReady}
          renderButton={(ready, resultEditable) => st.showButton === true ? <QuizDelayedButton delaySeconds={st.buttonDelaySeconds} ready={ready && buttonsReady} editable={resultEditable}><QuizPrimaryButton label={String(ct.buttonText || "Continuar")} runs={ct.buttonTextRuns} settings={settings} st={quizButtonSettings(el)} editable={resultEditable} onText={(buttonText, buttonTextRuns) => onContentChange?.({ buttonText, buttonTextRuns })} onClick={onAction} loading={loading} /></QuizDelayedButton> : null}
          editor={
            editable
              ? { selectedPart: null, onSelectPart: () => {}, onTextChange: onContentChange }
              : undefined
          }
        />
      );
    default:
      return null;
  }
}
