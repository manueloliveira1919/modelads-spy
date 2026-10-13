import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Play,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizSection, QuizSettings } from "@/lib/quiz-types";
import { QuizElementView, QuizFonts, QuizProgress, quizSurfaceStyle } from "./quiz-element-view";
import { AddElementMenu, ELEMENT_LABEL } from "./quiz-panels";
export { QuizFonts } from "./quiz-element-view";
export type PreviewDevice = "desktop" | "tablet" | "mobile";
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
  onElementSettingsChange,
  onElementAction,
  onAddElement,
  onNavigate,
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
  onElementSettingsChange?: (id: string, patch: Record<string, unknown>) => void;
  onElementAction?: (id: string, action: "up" | "down" | "duplicate" | "remove") => void;
  onAddElement?: (type: import("@/lib/quiz-types").ElementType) => void;
  onNavigate?: (index: number) => void;
}) {
  const editable = !!onElementContentChange;
  const [resultAnimations, setResultAnimations] = useState<Record<string, number>>({});
  const percent = total ? Math.round(((index + 1) / total) * 100) : 0;
  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)}>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Seção anterior"
          disabled={index === 0}
          onClick={() => onNavigate?.(index - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          {section?.title} · {index + 1}/{total}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Próxima seção"
          disabled={index >= total - 1}
          onClick={() => onNavigate?.(index + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div
        className="q-surface w-full rounded-2xl"
        style={{
          maxWidth: { desktop: 900, tablet: 680, mobile: 380 }[device],
          ...quizSurfaceStyle(settings),
        }}
        onClick={() => onSelectElement?.(null)}
      >
        <QuizFonts settings={settings} elements={[]} editor />
        <div className="q-card" style={{ maxWidth: settings.layout.contentWidth }}>
          <div className="q-step-header">
            <span>
              Etapa {index + 1} de {total}
            </span>
          </div>
          {settings.progress.enabled && (
            <div className="mb-7">
              <QuizProgress settings={settings} percent={percent} />
            </div>
          )}
          <div
            key={section?.id}
            className="q-section-entry flex flex-col"
            style={{ gap: settings.layout.spacing }}
          >
            {section?.elements.map((el) => {
              const selected = selectedElementId === el.id;
              return (
                <div
                  key={el.id}
                  data-quiz-element={el.type}
                  data-element-id={el.id}
                  className={cn("q-editor-element", selected && "is-selected")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement?.(el.id);
                  }}
                >
                  {selected && (
                    <>
                      <span className="q-element-tag">{ELEMENT_LABEL[el.type]}</span>
                      <div
                        className="q-element-tools"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {[
                          ["up", ArrowUp, "Subir"],
                          ["down", ArrowDown, "Descer"],
                          ["duplicate", Copy, "Duplicar"],
                          ["remove", Trash2, "Excluir"],
                        ].map(([action, Icon, label]) => {
                          const I = Icon as typeof ArrowUp;
                          return (
                            <Button
                              key={String(action)}
                              variant="ghost"
                              size="icon"
                              title={String(label)}
                              aria-label={String(label)}
                              onClick={() =>
                                onElementAction?.(
                                  el.id,
                                  action as "up" | "down" | "duplicate" | "remove",
                                )
                              }
                            >
                              <I className="h-3.5 w-3.5" />
                            </Button>
                          );
                        })}
                        {el.type === "text" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Diminuir texto"
                              onClick={() =>
                                onElementSettingsChange?.(el.id, {
                                  size: Math.max(10, Number(el.settings.size || 17) - 2),
                                })
                              }
                            >
                              A−
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Aumentar texto"
                              onClick={() =>
                                onElementSettingsChange?.(el.id, {
                                  size: Math.min(120, Number(el.settings.size || 17) + 2),
                                })
                              }
                            >
                              A+
                            </Button>
                            {[
                              ["left", AlignLeft],
                              ["center", AlignCenter],
                              ["right", AlignRight],
                            ].map(([align, Icon]) => {
                              const I = Icon as typeof AlignLeft;
                              return (
                                <Button
                                  key={String(align)}
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Alinhar ${align}`}
                                  onClick={() => onElementSettingsChange?.(el.id, { align })}
                                >
                                  <I className="h-3.5 w-3.5" />
                                </Button>
                              );
                            })}
                          </>
                        )}
                        {el.type === "result" && <Button variant="ghost" size="icon" aria-label="Ver animação" title="Ver animação" onClick={() => setResultAnimations(prev => ({ ...prev, [el.id]: (prev[el.id] || 0) + 1 }))}><Play className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </>
                  )}
                  <QuizElementView
                    el={el}
                    settings={settings}
                    percent={percent}
                    editable={editable}
                    resultAnimationKey={resultAnimations[el.id] || 0}
                    onContentChange={(p) => onElementContentChange?.(el.id, p)}
                  />
                </div>
              );
            })}
            {editable && onAddElement && (
              <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                <AddElementMenu onAdd={onAddElement} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
