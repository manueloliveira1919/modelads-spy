import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { normalizeRuns, readEditableRuns, runStyle, type TextRun } from "@/lib/quiz-rich-text";

/** Texto editável direto no preview (somente editor). Não re-renderiza o conteúdo
 *  enquanto está em foco, para o cursor não pular. */
export function EditableText({
  value,
  runs,
  editable,
  onChange,
  className,
  style,
  as: Tag = "p",
}: {
  value: string;
  runs?: unknown;
  editable: boolean;
  onChange?: (v: string, runs: TextRun[]) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "p" | "span" | "h2" | "div";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const normalized = normalizeRuns(runs);
  const usable = normalized.map(r => r.t).join("") === value ? normalized : [{ t: value }];
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || document.activeElement === node) return;
    node.replaceChildren(...usable.map(r => { const span = document.createElement("span"); span.textContent = r.t; for (const [key, val] of Object.entries(runStyle(r))) if (val !== undefined) (span.style as unknown as Record<string, string>)[key] = String(val); return span; }));
  }, [value, JSON.stringify(runs), editable]);
  if (!editable)
    return (
      <Tag className={className} style={style}>
        {usable.map((r, i) => <span key={i} style={runStyle(r)}>{r.t}</span>)}
      </Tag>
    );
  return (
    <Tag
      ref={ref as never}
      className={cn(className, editable && "cursor-text outline-none")}
      style={style}
      contentEditable={editable || undefined}
      suppressContentEditableWarning
      spellCheck={editable}
      data-placeholder="Digite..."
      data-rich-text
      onPaste={e => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      onInput={editable ? (e) => { const parsed = readEditableRuns(e.currentTarget as HTMLElement); onChange?.(parsed.map(r => r.t).join(""), parsed); } : undefined}
    />
  );
}
