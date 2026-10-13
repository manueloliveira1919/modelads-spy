import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Bold, Italic, Underline, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUIZ_FONTS, loadQuizFont } from "@/lib/quiz-visual";
import { validColor, validFont } from "@/lib/quiz-rich-text";

export type RichCommand = "font" | "color" | "b" | "i" | "u" | "clear";
const Context = createContext<{ apply: (command: RichCommand, value?: string, elementId?: string) => Promise<boolean> }>({ apply: async () => false });
export const useQuizRichText = () => useContext(Context);
export function QuizRichTextProvider({ children }: { children: ReactNode }) {
  const range = useRef<Range | null>(null);
  const root = useRef<HTMLElement | null>(null);
  const commandVersion = useRef(0);
  const scope = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  useEffect(() => {
    const update = () => {
      const selection = document.getSelection();
      if (!selection?.rangeCount) return;
      const r = selection.getRangeAt(0);
      const node = r.commonAncestorContainer;
      const element = node instanceof Element ? node : node.parentElement;
      const editable = element?.closest<HTMLElement>('[contenteditable="true"][data-rich-text]');
      if (editable && scope.current?.contains(editable)) {
        if (r.collapsed) { range.current = null; setPosition(null); return; }
        range.current = r.cloneRange(); root.current = editable;
        const rect = r.getBoundingClientRect();
        setPosition({ top: Math.max(8, rect.top - 54), left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)) });
        const surface = editable.closest(".q-surface");
        if (surface) { const css = getComputedStyle(surface); setPalette(["--q-primary", "--q-secondary", "--q-text"].map(k => css.getPropertyValue(k).trim()).filter(validColor)); }
      } else if (element && !element.closest('[data-rich-controls]')) { range.current = null; setPosition(null); }
    };
    const dismiss = (e: Event) => { const el = e.target as Element; if (!el.closest?.('[data-rich-controls]') && !el.closest?.('[data-rich-text]')) { range.current = null; setPosition(null); } };
    document.addEventListener("selectionchange", update);
    document.addEventListener("pointerdown", dismiss);
    const scroll = () => setPosition(null);
    window.addEventListener("scroll", scroll, true);
    return () => { document.removeEventListener("selectionchange", update); document.removeEventListener("pointerdown", dismiss); window.removeEventListener("scroll", scroll, true); };
  }, []);
  const apply = async (command: RichCommand, value?: string, elementId?: string) => {
    const version = ++commandVersion.current;
    const saved = range.current?.cloneRange(), editable = root.current;
    if (!saved || saved.collapsed || !editable?.isConnected || (elementId && editable.closest('[data-element-id]')?.getAttribute('data-element-id') !== elementId)) return false;
    if (command === "font") { if (!validFont(value)) return false; await loadQuizFont(value); }
    if (version !== commandVersion.current || !editable.isConnected) return true;
    if (command === "color" && !validColor(value)) return false;
    editable.focus(); const selection = document.getSelection();
    if (!selection) return false;
    selection.removeAllRanges(); selection.addRange(saved);
    if (command === "font" || command === "color") {
      const span = document.createElement("span");
      const fragment = saved.extractContents();
      fragment.querySelectorAll<HTMLElement>("*").forEach(n => { if (command === "font") { n.style.fontFamily = ""; n.removeAttribute("face"); } else { n.style.color = ""; n.removeAttribute("color"); } });
      span.append(fragment);
      if (command === "font") span.style.fontFamily = value ?? ""; else span.style.color = value ?? "";
      saved.insertNode(span); saved.selectNodeContents(span); selection.removeAllRanges(); selection.addRange(saved);
    } else if (command === "clear") {
      document.execCommand("removeFormat", false);
    } else document.execCommand({ b: "bold", i: "italic", u: "underline" }[command]);
    range.current = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    editable.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };
  return <Context.Provider value={{ apply }}><div ref={scope}>{children}</div>{position && <div data-rich-controls className="q-rich-toolbar" style={position} onMouseDown={e => { if (!(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLInputElement)) e.preventDefault(); }} role="toolbar" aria-label="Formatar trecho">
    <select aria-label="Fonte do trecho" defaultValue="" onChange={e => { void apply("font", e.target.value); e.target.value = ""; }}><option value="" disabled>Fonte</option>{QUIZ_FONTS.map(f => <option key={f}>{f}</option>)}</select>
    {palette.map(c => <Button key={c} variant="ghost" size="icon" aria-label={`Cor do trecho ${c}`} style={{ backgroundColor: c }} onClick={() => void apply("color", c)} />)}
    <input type="color" aria-label="Cor do trecho" defaultValue="#ffffff" onChange={e => void apply("color", e.target.value)} />
    {([["b", Bold, "Negrito"], ["i", Italic, "Itálico"], ["u", Underline, "Sublinhado"], ["clear", Eraser, "Limpar formatação"]] as const).map(([cmd, Icon, label]) => <Button key={cmd} variant="ghost" size="icon" aria-label={label} onClick={() => void apply(cmd)}><Icon className="h-4 w-4" /></Button>)}
  </div>}</Context.Provider>;
}