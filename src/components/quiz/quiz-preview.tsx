import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  animationClass,
  animationStyle,
  buttonTextVisualStyle,
  collectQuizFonts,
  quizFontsHref,
  textVisualStyle,
} from "@/lib/quiz-visual";
import type { QuizElement, QuizSection, QuizSettings } from "@/lib/quiz-types";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<PreviewDevice, number> = {
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

/** Carrega sob demanda as fontes usadas no quiz (display=swap). */
export function QuizFonts({
  settings,
  elements,
}: {
  settings: QuizSettings;
  elements: { settings: Record<string, unknown> }[];
}) {
  const href = quizFontsHref(collectQuizFonts(settings, elements));
  if (!href) return null;
  return <link rel="stylesheet" href={href} precedence="default" />;
}

/** Texto editável direto no preview (somente editor). Não re-renderiza o conteúdo
 *  enquanto está em foco, para o cursor não pular. */
function EditableText({
  value,
  editable,
  onChange,
  className,
  style,
  as: Tag = "p",
}: {
  value: string;
  editable: boolean;
  onChange?: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "p" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (node && document.activeElement !== node && node.innerText !== value) node.innerText = value;
  }, [value]);
  return (
    <Tag
      ref={ref as never}
      className={cn(className, editable && "cursor-text outline-none")}
      style={style}
      contentEditable={editable || undefined}
      suppressContentEditableWarning
      spellCheck={editable}
      onInput={editable ? (e) => onChange?.((e.currentTarget as HTMLElement).innerText) : undefined}
    >
      {value}
    </Tag>
  );
}

function ElementView({
  el,
  settings,
  percent,
  selected = false,
  onTextChange,
}: {
  el: QuizElement;
  settings: QuizSettings;
  percent: number;
  selected?: boolean;
  onTextChange?: (patch: Record<string, unknown>) => void;
}) {
  const st = el.settings as Record<string, any>;
  const ct = el.content as Record<string, any>;

  switch (el.type) {
    case "text":
      return (
        <div
          className={animationClass(st)}
          style={{ ...animationStyle(st), marginBottom: Number(st.spacing) || 0 }}
        >
          <EditableText
            value={String(ct.text ?? "")}
            editable={selected && !!onTextChange}
            onChange={(v) => onTextChange?.({ text: v })}
            style={textVisualStyle(st, settings, 16, 400)}
          />
        </div>
      );
    case "image":
      return ct.url ? (
        <div style={{ textAlign: st.align || "center" }}>
          <img
            src={ct.url}
            alt=""
            style={{
              width: `${Number(st.width) || 100}%`,
              height: Number(st.height) > 0 ? Number(st.height) : "auto",
              objectFit: "cover",
              borderRadius: Number(st.radius) || 0,
              display: "inline-block",
            }}
          />
        </div>
      ) : (
        <div
          className="grid place-items-center border border-dashed text-xs"
          style={{
            borderRadius: Number(st.radius) || 0,
            minHeight: 120,
            borderColor: `${settings.colors.text}33`,
            color: `${settings.colors.text}88`,
          }}
        >
          Imagem
        </div>
      );
    case "video": {
      const src = embedUrl(String(ct.url || ""));
      return src ? (
        <div
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
      ) : (
        <div
          className="grid place-items-center border border-dashed text-xs"
          style={{
            borderRadius: Number(st.radius) || 0,
            minHeight: 140,
            borderColor: `${settings.colors.text}33`,
            color: `${settings.colors.text}88`,
          }}
        >
          Vídeo (YouTube, Vimeo ou URL externa)
        </div>
      );
    }
    case "button": {
      const full = (st.width || settings.button.width) === "full";
      const txt = buttonTextVisualStyle(st, settings);
      return (
        <div className={animationClass(st)} style={{ ...animationStyle(st), textAlign: st.align || "center" }}>
          <button
            type="button"
            style={{
              ...txt,
              textAlign: "center",
              backgroundColor: st.bg || settings.colors.button,
              borderRadius: Number(st.radius ?? settings.button.radius),
              minHeight: settings.button.height,
              width: full ? "100%" : undefined,
              maxWidth: "100%",
              padding: full ? "8px 16px" : "8px 28px",
            }}
          >
            <EditableText
              as="span"
              value={String(ct.label ?? "Botão")}
              editable={selected && !!onTextChange}
              onChange={(v) => onTextChange?.({ label: v })}
            />
          </button>
        </div>
      );
    }
    case "options":
      return (
        <div className="flex flex-col gap-2">
          {((ct.options ?? []) as { id: string; label: string }[]).map((o) => (
            <div
              key={o.id}
              style={{
                border: `1px solid ${settings.colors.primary}55`,
                borderRadius: settings.button.radius,
                padding: "12px 16px",
                color: settings.colors.text,
                fontSize: 15,
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      );
    case "fields":
      return (
        <div className="flex flex-col gap-2">
          {((ct.fields ?? []) as { key: string; label: string; enabled: boolean }[])
            .filter((f) => f.enabled)
            .map((f) => (
              <div
                key={f.key}
                style={{
                  border: `1px solid ${settings.colors.text}22`,
                  borderRadius: settings.button.radius,
                  padding: "12px 16px",
                  color: `${settings.colors.text}77`,
                  fontSize: 14,
                }}
              >
                {f.label}
              </div>
            ))}
        </div>
      );
    case "percentage":
      return (
        <div
          style={{
            fontSize: Number(st.size) || 14,
            fontWeight: Number(st.weight) || 600,
            color: st.color || settings.colors.secondary,
            textAlign: st.align || "center",
          }}
        >
          {percent}% concluído
        </div>
      );
    case "progress":
      return <ProgressBar settings={settings} percent={percent} />;
    default:
      return null;
  }
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
            transition: "width .3s ease",
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

export function QuizPreview({
  section,
  settings,
  device,
  index,
  total,
  className,
  selectedElementId = null,
  onSelectElement,
  onElementContentChange,
  replayKey = 0,
}: {
  section: QuizSection | null;
  settings: QuizSettings;
  device: PreviewDevice;
  index: number;
  total: number;
  className?: string;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onElementContentChange?: (id: string, patch: Record<string, unknown>) => void;
  replayKey?: number;
}) {
  const percent = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  return (
    <div
      className={cn("flex w-full justify-center", className)}
      onClick={onSelectElement ? () => onSelectElement(null) : undefined}
    >
      <QuizFonts settings={settings} elements={section?.elements ?? []} />
      <div
        className="w-full overflow-hidden rounded-2xl border border-border shadow-2xl transition-all"
        style={{ maxWidth: DEVICE_WIDTH[device], ...backgroundStyle(settings) }}
      >
        <div
          className="mx-auto flex min-h-[460px] flex-col px-6 py-8"
          style={{
            maxWidth: settings.layout.contentWidth,
            fontFamily: `${settings.font}, system-ui, sans-serif`,
            color: settings.colors.text,
            alignItems:
              settings.layout.align === "left"
                ? "flex-start"
                : settings.layout.align === "right"
                  ? "flex-end"
                  : "stretch",
          }}
        >
          {settings.progress.enabled && (
            <div className="mb-6 w-full">
              <ProgressBar settings={settings} percent={percent} />
            </div>
          )}

          {!section ? (
            <div className="grid flex-1 place-items-center text-sm opacity-60">
              Adicione uma seção para começar
            </div>
          ) : (
            <div
              className="flex w-full flex-1 flex-col justify-center"
              style={{ gap: settings.layout.spacing }}
            >
              {section.elements.map((el) => {
                const selectable = !!onSelectElement && (el.type === "text" || el.type === "button");
                const isSel = selectable && selectedElementId === el.id;
                return (
                  <div
                    key={`${el.id}-${replayKey}`}
                    data-quiz-element={el.type}
                    className={cn(
                      "min-w-0 rounded-md",
                      selectable && "cursor-pointer outline-offset-4 hover:outline hover:outline-1 hover:outline-primary/40",
                      isSel && "outline outline-2 outline-primary hover:outline-2 hover:outline-primary",
                    )}
                    onClick={
                      selectable
                        ? (e) => {
                            e.stopPropagation();
                            if (!isSel) onSelectElement?.(el.id);
                          }
                        : undefined
                    }
                  >
                    <ElementView
                      el={el}
                      settings={settings}
                      percent={percent}
                      selected={isSel}
                      onTextChange={
                        onElementContentChange
                          ? (patch) => onElementContentChange(el.id, patch)
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
