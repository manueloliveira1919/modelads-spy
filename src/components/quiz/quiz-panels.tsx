import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { validateRule } from "@/lib/quiz-logic";
import { rangeError, type ResultRange } from "@/lib/quiz-result";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  uid,
  type ElementType,
  type QuizElement,
  type QuizSection,
  type QuizSettings,
  type OptionItem,
  type FieldsContent,
} from "@/lib/quiz-types";
import { QUIZ_FONTS } from "@/lib/quiz-visual";
import { QUIZ_THEMES, applyQuizTheme, readableQuizText } from "@/lib/quiz-themes";
import { uploadPageImage } from "@/lib/sales-page-api";
export const ELEMENT_LABEL: Record<ElementType, string> = {
  text: "Texto",
  image: "Imagem",
  video: "Vídeo",
  button: "Botão",
  options: "Opções",
  fields: "Campos",
  result: "Resultado",
  progress: "Progresso",
  percentage: "Porcentagem",
};
export function AddElementMenu({ onAdd }: { onAdd: (type: ElementType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4" />
          Adicionar elemento
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(["text", "image", "video", "button", "options", "fields", "result"] as ElementType[]).map(
          (t) => (
            <DropdownMenuItem key={t} onSelect={() => onAdd(t)}>
              {ELEMENT_LABEL[t]}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
function ColorField({
  label,
  value,
  fallback,
  onChange,
  palette = [],
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
  palette?: string[];
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap items-center gap-2">
        {[...new Set(palette)].map((c) => (
          <Button
            key={c}
            variant="outline"
            size="icon"
            aria-label={`Usar cor ${c}`}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          aria-label={label}
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-md border border-border"
        />
        {value && (
          <Button size="sm" variant="ghost" onClick={() => onChange("")}>
            Padrão
          </Button>
        )}
      </div>
    </Field>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <Label>{label}</Label>
      <Switch aria-label={label} checked={value} onCheckedChange={onChange} />
    </div>
  );
}
function Chips({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string | number;
  items: (readonly [string | number, string])[];
  onChange: (v: any) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {items.map(([v, l]) => (
          <Button key={v} variant={value === v ? "default" : "outline"} onClick={() => onChange(v)}>
            {l}
          </Button>
        ))}
      </div>
    </Field>
  );
}
export function AlignControls({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {(
        [
          ["left", AlignLeft, "Esquerda"],
          ["center", AlignCenter, "Centro"],
          ["right", AlignRight, "Direita"],
        ] as const
      ).map(([v, I, l]) => (
        <Button
          key={v}
          variant={value === v ? "default" : "outline"}
          size="icon"
          aria-label={l}
          onClick={() => onChange(v)}
        >
          <I className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
export function ElementEditor({
  el,
  settings,
  allSections,
  userId,
  onContentChange,
  onSettingsChange,
}: {
  el: QuizElement;
  settings: QuizSettings;
  allSections: QuizSection[];
  userId: string;
  onContentChange: (p: Record<string, unknown>) => void;
  onSettingsChange: (p: Record<string, unknown>) => void;
}) {
  const st = el.settings,
    ct = el.content;
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const palette = Object.values(settings.colors);
  const setSt = onSettingsChange,
    setCt = onContentChange;
  const options = (ct.options ?? []) as (OptionItem & { emoji?: string })[];
  const upload = async (file: File) => {
    setUploading(true);
    try {
      setCt({ url: await uploadPageImage(userId, file) });
    } catch {
      toast.error("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold">{ELEMENT_LABEL[el.type]}</h3>
      {el.type === "text" && (
        <>
          <Chips
            label="Tamanho"
            value={Number(st.size) || 17}
            items={[
              [14, "Pequeno"],
              [17, "Normal"],
              [24, "Grande"],
              [32, "Título"],
            ]}
            onChange={(size) => setSt({ size })}
          />
          <Field label="Alinhamento">
            <AlignControls
              value={String(st.align || "center")}
              onChange={(align) => setSt({ align })}
            />
          </Field>
          <ColorField
            label="Cor"
            value={String(st.color || "")}
            fallback={settings.colors.text}
            palette={palette}
            onChange={(color) => setSt({ color })}
          />
          <Button
            aria-label="Negrito"
            aria-pressed={Number(st.weight) >= 700}
            variant={Number(st.weight) >= 700 ? "default" : "outline"}
            size="icon"
            onClick={() => setSt({ weight: Number(st.weight) >= 700 ? 400 : 700 })}
          >
            <Bold className="h-4 w-4" />
          </Button>
        </>
      )}
      {el.type === "button" && (
        <>
          <SelectField
            label="Ação"
            value={String(st.cta || "none")}
            options={[
              { value: "none", label: "Avançar" },
              { value: "url", label: "Abrir link" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "checkout", label: "Checkout" },
              ...(st.cta === "sales" ? [{ value: "sales", label: "Página de vendas" }] : []),
            ]}
            onChange={(cta) => setSt({ cta })}
          />
          {["url", "checkout", "sales"].includes(String(st.cta)) && (
            <Field label="Destino">
              <Input
                value={String(st.ctaUrl || "")}
                placeholder="https://..."
                onChange={(e) => setSt({ ctaUrl: e.target.value })}
              />
            </Field>
          )}
          {st.cta === "whatsapp" && (
            <>
              <Field label="WhatsApp com DDD">
                <Input
                  value={String(st.ctaPhone || "")}
                  onChange={(e) => setSt({ ctaPhone: e.target.value })}
                />
              </Field>
              <Field label="Mensagem">
                <Textarea
                  value={String(st.ctaMessage || "")}
                  onChange={(e) => setSt({ ctaMessage: e.target.value })}
                />
              </Field>
            </>
          )}
          {st.cta && st.cta !== "none" && (
            <Toggle
              label="Abrir em nova aba"
              value={st.ctaTarget !== "_self"}
              onChange={(v) => setSt({ ctaTarget: v ? "_blank" : "_self" })}
            />
          )}
          <ColorField
            label="Cor do botão"
            value={String(st.bg || "")}
            fallback={settings.colors.button}
            palette={palette}
            onChange={(bg) => setSt({ bg })}
          />
        </>
      )}
      {el.type === "image" && (
        <>
          <Field label="Imagem">
            <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border">
              <Upload className="h-4 w-4" />
              {uploading ? "Enviando..." : "Enviar imagem"}
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
            </label>
          </Field>
          <Field label="URL">
            <Input value={String(ct.url || "")} onChange={(e) => setCt({ url: e.target.value })} />
          </Field>
          <Chips
            label="Tamanho"
            value={Number(st.width) || 100}
            items={[
              [35, "P"],
              [60, "M"],
              [80, "G"],
              [100, "Cheia"],
            ]}
            onChange={(width) => setSt({ width })}
          />
          <Toggle
            label="Cantos arredondados"
            value={Number(st.radius) > 0}
            onChange={(v) => setSt({ radius: v ? 24 : 0 })}
          />
        </>
      )}
      {el.type === "video" && (
        <Field label="URL do vídeo">
          <Input
            value={String(ct.url || "")}
            placeholder="https://..."
            onChange={(e) => setCt({ url: e.target.value })}
          />
        </Field>
      )}
      {el.type === "options" && (
        <>
          <Chips
            label="Seleção"
            value={String(st.selection || "single")}
            items={[
              ["single", "Única"],
              ["multiple", "Múltipla"],
            ]}
            onChange={(selection) => setSt({ selection })}
          />
          <Toggle
            label="Obrigatória"
            value={st.required !== false}
            onChange={(required) => setSt({ required })}
          />
          {options.map((o, i) => {
            const update = (patch: Record<string, unknown>) =>
              setCt({ options: options.map((x) => (x.id === o.id ? { ...x, ...patch } : x)) });
            return (
              <div key={o.id} className="space-y-2 border-t border-border pt-3">
                <Field label={`Opção ${i + 1}`}>
                  <Input value={o.label} onChange={(e) => update({ label: e.target.value })} />
                </Field>
                <div className="grid grid-cols-[64px_1fr] gap-2">
                  <Input
                    aria-label={`Emoji da opção ${i + 1}`}
                    placeholder="🙂"
                    value={o.emoji || ""}
                    onChange={(e) => update({ emoji: e.target.value })}
                  />
                  <Input
                    aria-label={`Imagem da opção ${i + 1}`}
                    placeholder="URL da imagem"
                    value={o.image || ""}
                    onChange={(e) => update({ image: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
          <details className="q-panel-details">
            <summary>Avançado</summary>
            <div className="space-y-4 pt-4">
              {options.map((o) => (
                <div key={o.id} className="space-y-3">
                  <Label>{o.label}</Label>
                  <Field label="Pontos do resultado">
                    <Input
                      type="number"
                      min={0}
                      value={o.value ?? ""}
                      onChange={(e) => {
                        const copy = { ...o };
                        if (e.target.value === "") delete copy.value;
                        else copy.value = Math.max(0, Math.trunc(Number(e.target.value) || 0));
                        setCt({ options: options.map((x) => (x.id === o.id ? copy : x)) });
                      }}
                    />
                  </Field>
                  <SelectField
                    label="Ir para seção"
                    value={allSections.some((s) => s.id === o.next) ? String(o.next) : "__default"}
                    options={[
                      { value: "__default", label: "Próxima seção" },
                      ...allSections
                        .filter((s) => s.id !== el.section_id)
                        .map((s) => ({ value: s.id, label: s.title })),
                    ]}
                    onChange={(v) => {
                      const target = v === "__default" ? null : v;
                      const err = validateRule(allSections, el.section_id, el.id, o.id, target);
                      setRuleErrors((m) => ({ ...m, [o.id]: err || "" }));
                      if (err) return;
                      const copy = { ...o };
                      if (target) copy.next = target;
                      else delete copy.next;
                      setCt({ options: options.map((x) => (x.id === o.id ? copy : x)) });
                    }}
                  />
                  {ruleErrors[o.id] && (
                    <p className="text-xs text-destructive">{ruleErrors[o.id]}</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        </>
      )}
      {el.type === "fields" &&
        ((ct.fields ?? []) as FieldsContent["fields"]).map((f) => {
          const update = (patch: Record<string, unknown>) =>
            setCt({
              fields: ((ct.fields ?? []) as FieldsContent["fields"]).map((x) =>
                x.key === f.key ? { ...x, ...patch } : x,
              ),
            });
          return (
            <div key={f.key} className="border-t border-border pt-2">
              <Toggle
                label={f.label}
                value={f.enabled}
                onChange={(enabled) => update({ enabled })}
              />
              <Toggle
                label="Obrigatório"
                value={f.required !== false}
                onChange={(required) => update({ required })}
              />
            </div>
          );
        })}
      {el.type === "result" && <ResultEditor ct={ct} st={st} setCt={setCt} setSt={setSt} />}
    </div>
  );
}
export function SectionProperties({
  section,
  onChange,
  onSelect,
  onAction,
  onAdd,
}: {
  section: QuizSection;
  onChange: (patch: Partial<QuizSection>) => void;
  onSelect: (id: string) => void;
  onAction: (id: string, action: "up" | "down" | "duplicate" | "remove") => void;
  onAdd: (type: ElementType) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nome da seção">
        <Input value={section.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      {section.elements.map((el) => (
        <div key={el.id} className="flex items-center gap-1 border-b border-border py-2">
          <Button
            variant="ghost"
            className="min-w-0 flex-1 justify-start truncate"
            onClick={() => onSelect(el.id)}
          >
            {ELEMENT_LABEL[el.type]}
          </Button>
          {(
            [
              ["up", ArrowUp, "Subir"],
              ["down", ArrowDown, "Descer"],
              ["remove", Trash2, "Excluir"],
            ] as const
          ).map(([a, I, l]) => (
            <Button
              key={a}
              variant="ghost"
              size="icon"
              aria-label={l}
              onClick={() => onAction(el.id, a)}
            >
              <I className="h-4 w-4" />
            </Button>
          ))}
        </div>
      ))}
      <AddElementMenu onAdd={onAdd} />
    </div>
  );
}
export function ThemePanel({
  settings,
  onChange,
}: {
  settings: QuizSettings;
  onChange: (patch: Partial<QuizSettings>) => void;
}) {
  const s = settings;
  const setBackground = (patch: Partial<QuizSettings["background"]>) => {
    const bg = { ...s.background, ...patch };
    onChange({
      background: bg,
      colors: {
        ...s.colors,
        text: readableQuizText(bg.type === "gradient" ? bg.gradientFrom : bg.color),
      },
    });
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {QUIZ_THEMES.map((t, i) => (
          <Button
            key={t.name}
            className="h-auto min-h-16 flex-col gap-2 whitespace-normal px-2 py-3"
            variant={s.colors.primary === t.primary ? "default" : "outline"}
            onClick={() => onChange(applyQuizTheme(i, s))}
          >
            <span className="flex gap-1" aria-hidden>
              {[t.bg, t.primary, t.secondary].map((c) => (
                <span
                  key={c}
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ background: c }}
                />
              ))}
            </span>
            {t.name}
          </Button>
        ))}
      </div>
      <ColorField
        label="Cor principal"
        value={s.colors.primary}
        fallback={s.colors.primary}
        onChange={(primary) =>
          onChange({
            colors: {
              ...s.colors,
              primary,
              button: primary,
              buttonText: readableQuizText(primary),
            },
          })
        }
      />
      <SelectField
        label="Fonte"
        value={s.font}
        options={[
          ...QUIZ_FONTS.map((f) => ({ value: f, label: f })),
          { value: "system-ui", label: "Sistema" },
        ]}
        onChange={(font) => onChange({ font })}
      />
      <Chips
        label="Cantos"
        value={s.button.radius === 0 ? 0 : s.button.radius >= 20 ? 24 : 12}
        items={[
          [0, "Reto"],
          [12, "Suave"],
          [24, "Redondo"],
        ]}
        onChange={(radius) => onChange({ button: { ...s.button, radius } })}
      />
      <Toggle
        label="Barra de progresso"
        value={s.progress.enabled}
        onChange={(enabled) => onChange({ progress: { ...s.progress, enabled } })}
      />
      <details className="q-panel-details">
        <summary>Mais opções</summary>
        <div className="space-y-4 pt-4">
          <SelectField
            label="Fundo"
            value={s.background.type}
            options={[
              { value: "color", label: "Cor" },
              { value: "gradient", label: "Gradiente" },
              { value: "image", label: "Imagem" },
            ]}
            onChange={(type) => setBackground({ type: type as QuizSettings["background"]["type"] })}
          />
          {s.background.type === "image" ? (
            <Input
              aria-label="Imagem de fundo"
              value={s.background.imageUrl}
              onChange={(e) => setBackground({ imageUrl: e.target.value })}
            />
          ) : (
            <>
              <ColorField
                label="Fundo"
                value={
                  s.background.type === "gradient" ? s.background.gradientFrom : s.background.color
                }
                fallback={s.background.color}
                onChange={(v) =>
                  setBackground(
                    s.background.type === "gradient" ? { gradientFrom: v, color: v } : { color: v },
                  )
                }
              />
              {s.background.type === "gradient" && (
                <ColorField
                  label="Fim do gradiente"
                  value={s.background.gradientTo}
                  fallback={s.background.gradientTo}
                  onChange={(gradientTo) => setBackground({ gradientTo })}
                />
              )}
            </>
          )}
          <ColorField
            label="Cor secundária"
            value={s.colors.secondary}
            fallback={s.colors.secondary}
            onChange={(secondary) => onChange({ colors: { ...s.colors, secondary } })}
          />
          <ColorField
            label="Cor do texto"
            value={s.colors.text}
            fallback={s.colors.text}
            onChange={(text) => onChange({ colors: { ...s.colors, text } })}
          />
          <ColorField
            label="Texto do botão"
            value={s.colors.buttonText}
            fallback={s.colors.buttonText}
            onChange={(buttonText) => onChange({ colors: { ...s.colors, buttonText } })}
          />
          <Toggle
            label="Mostrar porcentagem"
            value={s.progress.showPercentage}
            onChange={(showPercentage) => onChange({ progress: { ...s.progress, showPercentage } })}
          />
          <Chips
            label="Largura do conteúdo"
            value={s.layout.contentWidth}
            items={[
              [420, "Compacta"],
              [560, "Normal"],
              [720, "Ampla"],
            ]}
            onChange={(contentWidth) => onChange({ layout: { ...s.layout, contentWidth } })}
          />
          <Chips
            label="Distância entre elementos"
            value={s.layout.spacing}
            items={[
              [12, "Pequena"],
              [20, "Normal"],
              [32, "Grande"],
            ]}
            onChange={(spacing) => onChange({ layout: { ...s.layout, spacing } })}
          />
        </div>
      </details>
    </div>
  );
}
function ResultEditor({
  ct,
  st,
  setCt,
  setSt,
}: {
  ct: Record<string, any>;
  st: Record<string, any>;
  setCt: (p: Record<string, unknown>) => void;
  setSt: (p: Record<string, unknown>) => void;
}) {
  const ranges = (ct.ranges ?? []) as ResultRange[];
  const setRanges = (r: ResultRange[]) => setCt({ ranges: r });
  const upd = (i: number, patch: Partial<ResultRange>) =>
    setRanges(ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const num = (v: string): number | null => (v === "" ? null : Math.trunc(Number(v) || 0));
  const move = (i: number, d: -1 | 1) => {
    const t = i + d;
    if (t < 0 || t >= ranges.length) return;
    const n = [...ranges];
    const [x] = n.splice(i, 1);
    n.splice(t, 0, x);
    setRanges(n);
  };
  return (
    <div className="space-y-3">
      <div>
        <SelectField
          label="Gráfico"
          value={String(st.chart ?? "bar")}
          options={[
            { value: "bar", label: "Barra" },
            { value: "circle", label: "Circular" },
            { value: "none", label: "Nenhum" },
          ]}
          onChange={(v) => setSt({ chart: v })}
        />
      </div>
      <Toggle
        label="Confete"
        value={st.confetti !== false}
        onChange={(confetti) => setSt({ confetti })}
      />
      <details className="q-panel-details">
        <summary>Avançado</summary>
        <div className="space-y-2 pt-3">
          <Field label="Sufixo da pontuação">
            <Input
              value={st.scoreSuffix ?? "pontos"}
              onChange={(e) => setSt({ scoreSuffix: e.target.value })}
            />
          </Field>
          <Toggle
            label="Mostrar pontuação"
            value={st.showScore !== false}
            onChange={(showScore) => setSt({ showScore })}
          />
          <Toggle
            label="Mostrar percentual"
            value={st.showPercent !== false}
            onChange={(showPercent) => setSt({ showPercent })}
          />
          <Field label="Imagem do resultado">
            <Input value={ct.image ?? ""} onChange={(e) => setCt({ image: e.target.value })} />
          </Field>

          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Faixas de resultado
          </div>
          {ranges.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Sem faixas, o resultado padrão é exibido com a pontuação total.
            </p>
          )}
          {ranges.map((r, i) => {
            const err = rangeError(r);
            return (
              <div key={r.id} className="space-y-2 rounded-lg border border-border p-2">
                <div className="flex items-center gap-1">
                  <span className="flex-1 text-xs font-medium">Faixa {i + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mover faixa para cima"
                    onClick={() => move(i, -1)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mover faixa para baixo"
                    onClick={() => move(i, 1)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Duplicar faixa"
                    onClick={() => {
                      const n = [...ranges];
                      n.splice(i + 1, 0, { ...r, id: uid() });
                      setRanges(n);
                    }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir faixa"
                    onClick={() => setRanges(ranges.filter((x) => x.id !== r.id))}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Mín."
                    value={r.min ?? ""}
                    onChange={(e) => upd(i, { min: num(e.target.value) })}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Máx."
                    value={r.max ?? ""}
                    onChange={(e) => upd(i, { max: num(e.target.value) })}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="% (opc.)"
                    min={0}
                    max={100}
                    value={r.percent ?? ""}
                    onChange={(e) => {
                      const v = num(e.target.value);
                      upd(i, { percent: v === null ? null : Math.min(100, Math.max(0, v)) });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                {err && <p className="text-[11px] text-destructive">{err}</p>}
                <Input
                  placeholder="Título"
                  value={r.title}
                  onChange={(e) => upd(i, { title: e.target.value })}
                  className="h-8 text-xs"
                />
                <Textarea
                  placeholder="Descrição"
                  value={r.description}
                  onChange={(e) => upd(i, { description: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
                <Input
                  placeholder="URL da imagem (opcional)"
                  value={r.image ?? ""}
                  onChange={(e) => upd(i, { image: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const last = ranges[ranges.length - 1];
              const min = last && last.max !== null ? last.max + 1 : 0;
              setRanges([
                ...ranges,
                {
                  id: uid(),
                  min,
                  max: min + 20,
                  title: "",
                  description: "",
                  image: "",
                  percent: null,
                },
              ]);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar faixa
          </Button>
        </div>
      </details>
    </div>
  );
}
