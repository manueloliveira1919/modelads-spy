import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Texto editável direto no preview (somente editor). Não re-renderiza o conteúdo
 *  enquanto está em foco, para o cursor não pular. */
export function EditableText({
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
  as?: "p" | "span" | "h2" | "div";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
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
    />
  );
}
