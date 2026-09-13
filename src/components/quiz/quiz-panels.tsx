import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
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
  makeElement,
  uid,
  type ElementType,
  type QuizElement,
  type QuizSection,
  type QuizSettings,
} from "@/lib/quiz-types";

const ELEMENT_LABEL: Record<ElementType, string> = {
  text: "Texto",
  image: "Imagem",
  video: "Vídeo",
  button: "Botão",
  options: "Opções",
  progress: "Barra de progresso",
  percentage: "Porcentagem",
  fields: "Campos de captura",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9"
      />
    </Field>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded-md border border-border bg-transparent"
        />
        <Input
          value={value}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9"
        />
      </div>
    </Field>
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
        <SelectTrigger className="h-9">
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

const ALIGN_OPTIONS = [
  { value: "left", label: "Esquerda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Direita" },
];

function ElementEditor({
  el,
  onChange,
  onRemove,
  onMove,
}: {
  el: QuizElement;
  onChange: (patch: Partial<QuizElement>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const st = el.settings as Record<string, any>;
  const ct = el.content as Record<string, any>;
  const setSt = (patch: Record<string, unknown>) => onChange({ settings: { ...st, ...patch } });
  const setCt = (patch: Record<string, unknown>) => onChange({ content: { ...ct, ...patch } });

  return (
    <details className="group rounded-xl border border-border bg-card/60" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-semibold">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <span className="flex-1 truncate">{ELEMENT_LABEL[el.type]}</span>
        <button
          type="button"
          aria-label="Mover para cima"
          onClick={(e) => {
            e.preventDefault();
            onMove(-1);
          }}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Mover para baixo"
          onClick={(e) => {
            e.preventDefault();
            onMove(1);
          }}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          ↓
        </button>
        <button
          type="button"
          aria-label="Remover elemento"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="rounded p-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </summary>

      <div className="space-y-3 border-t border-border p-3">
        {el.type === "text" && (
          <>
            <Field label="Conteúdo">
              <Textarea
                value={ct.text ?? ""}
                onChange={(e) => setCt({ text: e.target.value })}
                rows={3}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Tamanho" value={Number(st.size)} onChange={(v) => setSt({ size: v })} />
              <SelectField
                label="Peso"
                value={String(st.weight ?? 400)}
                options={[
                  { value: "300", label: "Leve" },
                  { value: "400", label: "Normal" },
                  { value: "500", label: "Médio" },
                  { value: "600", label: "Semi-negrito" },
                  { value: "700", label: "Negrito" },
                  { value: "800", label: "Extra negrito" },
                ]}
                onChange={(v) => setSt({ weight: Number(v) })}
              />
              <SelectField
                label="Alinhamento"
                value={String(st.align ?? "center")}
                options={ALIGN_OPTIONS}
                onChange={(v) => setSt({ align: v })}
              />
              <NumberField
                label="Espaçamento"
                value={Number(st.spacing)}
                onChange={(v) => setSt({ spacing: v })}
              />
            </div>
            <ColorField
              label="Cor"
              value={String(st.color ?? "")}
              fallback="#F5F7FF"
              onChange={(v) => setSt({ color: v })}
            />
          </>
        )}

        {el.type === "image" && (
          <>
            <Field label="URL da imagem">
              <Input
                value={ct.url ?? ""}
                placeholder="https://..."
                onChange={(e) => setCt({ url: e.target.value })}
                className="h-9"
              />
            </Field>
            <Field label="Upload">
              <Input
                type="file"
                accept="image/*"
                className="h-9"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setCt({ url: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Largura (%)" value={Number(st.width)} onChange={(v) => setSt({ width: v })} max={100} />
              <NumberField label="Altura (px, 0 = auto)" value={Number(st.height)} onChange={(v) => setSt({ height: v })} />
              <NumberField label="Arredondamento" value={Number(st.radius)} onChange={(v) => setSt({ radius: v })} />
              <SelectField
                label="Alinhamento"
                value={String(st.align ?? "center")}
                options={ALIGN_OPTIONS}
                onChange={(v) => setSt({ align: v })}
              />
            </div>
          </>
        )}

        {el.type === "video" && (
          <>
            <Field label="URL do vídeo (YouTube, Vimeo ou externo)">
              <Input
                value={ct.url ?? ""}
                placeholder="https://youtube.com/watch?v=..."
                onChange={(e) => setCt({ url: e.target.value })}
                className="h-9"
              />
            </Field>
            <NumberField label="Arredondamento" value={Number(st.radius)} onChange={(v) => setSt({ radius: v })} />
          </>
        )}

        {el.type === "button" && (
          <>
            <Field label="Texto">
              <Input value={ct.label ?? ""} onChange={(e) => setCt({ label: e.target.value })} className="h-9" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Tamanho do texto" value={Number(st.size)} onChange={(v) => setSt({ size: v })} />
              <SelectField
                label="Largura"
                value={String(st.width ?? "full")}
                options={[
                  { value: "full", label: "Cheia" },
                  { value: "auto", label: "Automática" },
                ]}
                onChange={(v) => setSt({ width: v })}
              />
              <SelectField
                label="Alinhamento"
                value={String(st.align ?? "center")}
                options={ALIGN_OPTIONS}
                onChange={(v) => setSt({ align: v })}
              />
              <NumberField label="Arredondamento" value={Number(st.radius)} onChange={(v) => setSt({ radius: v })} />
            </div>
            <ColorField label="Cor do botão" value={String(st.bg ?? "")} fallback="#6D7CFF" onChange={(v) => setSt({ bg: v })} />
            <ColorField label="Cor do texto" value={String(st.color ?? "")} fallback="#FFFFFF" onChange={(v) => setSt({ color: v })} />
            <p className="text-[11px] text-muted-foreground">
              A ação/URL do botão será configurada nas próximas fases.
            </p>
          </>
        )}

        {el.type === "options" && (
          <div className="space-y-2">
            {((ct.options ?? []) as { id: string; label: string }[]).map((o, i) => (
              <div key={o.id} className="flex items-center gap-2">
                <Input
                  value={o.label}
                  onChange={(e) => {
                    const next = [...(ct.options as { id: string; label: string }[])];
                    next[i] = { ...o, label: e.target.value };
                    setCt({ options: next });
                  }}
                  className="h-9"
                />
                <button
                  type="button"
                  aria-label="Remover opção"
                  onClick={() =>
                    setCt({
                      options: (ct.options as { id: string }[]).filter((x) => x.id !== o.id),
                    })
                  }
                  className="rounded p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCt({
                  options: [
                    ...((ct.options ?? []) as { id: string; label: string }[]),
                    { id: uid(), label: `Opção ${(((ct.options as unknown[]) ?? []).length ?? 0) + 1}` },
                  ],
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar opção
            </Button>
          </div>
        )}

        {el.type === "fields" && (
          <div className="space-y-2">
            {((ct.fields ?? []) as { key: string; label: string; enabled: boolean }[]).map((f, i) => (
              <div key={f.key} className="flex items-center gap-2">
                <Input
                  value={f.label}
                  onChange={(e) => {
                    const next = [...(ct.fields as any[])];
                    next[i] = { ...f, label: e.target.value };
                    setCt({ fields: next });
                  }}
                  className="h-9"
                />
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(v) => {
                    const next = [...(ct.fields as any[])];
                    next[i] = { ...f, enabled: v };
                    setCt({ fields: next });
                  }}
                />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              A captura de leads será ativada nas próximas fases.
            </p>
          </div>
        )}

        {el.type === "percentage" && (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Tamanho" value={Number(st.size)} onChange={(v) => setSt({ size: v })} />
            <NumberField label="Peso" value={Number(st.weight)} onChange={(v) => setSt({ weight: v })} max={900} />
            <SelectField
              label="Alinhamento"
              value={String(st.align ?? "center")}
              options={ALIGN_OPTIONS}
              onChange={(v) => setSt({ align: v })}
            />
            <ColorField label="Cor" value={String(st.color ?? "")} fallback="#1DB8FF" onChange={(v) => setSt({ color: v })} />
          </div>
        )}

        {el.type === "progress" && (
          <p className="text-[11px] text-muted-foreground">
            O estilo da barra é definido no painel Aparência. O percentual é calculado pela posição
            da seção.
          </p>
        )}
      </div>
    </details>
  );
}

export function SectionProperties({
  section,
  onChange,
}: {
  section: QuizSection;
  onChange: (patch: Partial<QuizSection>) => void;
}) {
  const setElement = (id: string, patch: Partial<QuizElement>) =>
    onChange({
      elements: section.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });

  const moveElement = (id: string, dir: -1 | 1) => {
    const idx = section.elements.findIndex((e) => e.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= section.elements.length) return;
    const next = [...section.elements];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange({ elements: next.map((e, i) => ({ ...e, position: i })) });
  };

  const addElement = (type: ElementType) =>
    onChange({
      elements: [...section.elements, makeElement(section.id, type, section.elements.length)],
    });

  return (
    <div className="space-y-4">
      <Field label="Nome da seção">
        <Input value={section.title} onChange={(e) => onChange({ title: e.target.value })} className="h-9" />
      </Field>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Elementos
        </div>
        {section.elements.map((el) => (
          <ElementEditor
            key={el.id}
            el={el}
            onChange={(patch) => setElement(el.id, patch)}
            onRemove={() =>
              onChange({ elements: section.elements.filter((e) => e.id !== el.id) })
            }
            onMove={(dir) => moveElement(el.id, dir)}
          />
        ))}
      </div>

      <Field label="Adicionar elemento">
        <Select value="" onValueChange={(v) => addElement(v as ElementType)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Escolher elemento..." />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ELEMENT_LABEL) as ElementType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {ELEMENT_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export function AppearancePanel({
  settings,
  onChange,
}: {
  settings: QuizSettings;
  onChange: (patch: Partial<QuizSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <SelectField
        label="Fonte"
        value={settings.font}
        options={[
          { value: "Poppins", label: "Poppins" },
          { value: "Inter", label: "Inter" },
          { value: "Montserrat", label: "Montserrat" },
          { value: "system-ui", label: "Sistema" },
        ]}
        onChange={(v) => onChange({ font: v })}
      />

      <SelectField
        label="Tipo de fundo"
        value={settings.background.type}
        options={[
          { value: "color", label: "Cor sólida" },
          { value: "gradient", label: "Gradiente" },
          { value: "image", label: "Imagem" },
        ]}
        onChange={(v) => onChange({ background: { ...settings.background, type: v as any } })}
      />
      {settings.background.type === "color" && (
        <ColorField
          label="Cor de fundo"
          value={settings.background.color}
          fallback="#090B14"
          onChange={(v) => onChange({ background: { ...settings.background, color: v } })}
        />
      )}
      {settings.background.type === "gradient" && (
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="Início"
            value={settings.background.gradientFrom}
            fallback="#090B14"
            onChange={(v) => onChange({ background: { ...settings.background, gradientFrom: v } })}
          />
          <ColorField
            label="Fim"
            value={settings.background.gradientTo}
            fallback="#141A2E"
            onChange={(v) => onChange({ background: { ...settings.background, gradientTo: v } })}
          />
        </div>
      )}
      {settings.background.type === "image" && (
        <Field label="URL da imagem de fundo">
          <Input
            value={settings.background.imageUrl}
            onChange={(e) => onChange({ background: { ...settings.background, imageUrl: e.target.value } })}
            className="h-9"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Cor principal"
          value={settings.colors.primary}
          fallback="#6D7CFF"
          onChange={(v) => onChange({ colors: { ...settings.colors, primary: v } })}
        />
        <ColorField
          label="Cor secundária"
          value={settings.colors.secondary}
          fallback="#1DB8FF"
          onChange={(v) => onChange({ colors: { ...settings.colors, secondary: v } })}
        />
        <ColorField
          label="Cor do texto"
          value={settings.colors.text}
          fallback="#F5F7FF"
          onChange={(v) => onChange({ colors: { ...settings.colors, text: v } })}
        />
        <ColorField
          label="Cor dos botões"
          value={settings.colors.button}
          fallback="#6D7CFF"
          onChange={(v) => onChange({ colors: { ...settings.colors, button: v } })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Arredondamento dos botões"
          value={settings.button.radius}
          onChange={(v) => onChange({ button: { ...settings.button, radius: v } })}
        />
        <NumberField
          label="Altura dos botões"
          value={settings.button.height}
          onChange={(v) => onChange({ button: { ...settings.button, height: v } })}
        />
        <SelectField
          label="Largura dos botões"
          value={settings.button.width}
          options={[
            { value: "full", label: "Cheia" },
            { value: "auto", label: "Automática" },
          ]}
          onChange={(v) => onChange({ button: { ...settings.button, width: v as any } })}
        />
        <NumberField
          label="Largura do conteúdo"
          value={settings.layout.contentWidth}
          max={1200}
          onChange={(v) => onChange({ layout: { ...settings.layout, contentWidth: v } })}
        />
        <NumberField
          label="Espaçamento"
          value={settings.layout.spacing}
          onChange={(v) => onChange({ layout: { ...settings.layout, spacing: v } })}
        />
        <SelectField
          label="Alinhamento"
          value={settings.layout.align}
          options={ALIGN_OPTIONS}
          onChange={(v) => onChange({ layout: { ...settings.layout, align: v as any } })}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Barra de progresso</Label>
          <Switch
            checked={settings.progress.enabled}
            onCheckedChange={(v) => onChange({ progress: { ...settings.progress, enabled: v } })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Mostrar porcentagem</Label>
          <Switch
            checked={settings.progress.showPercentage}
            onCheckedChange={(v) => onChange({ progress: { ...settings.progress, showPercentage: v } })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Espessura"
            value={settings.progress.thickness}
            onChange={(v) => onChange({ progress: { ...settings.progress, thickness: v } })}
          />
          <NumberField
            label="Arredondamento"
            value={settings.progress.radius}
            onChange={(v) => onChange({ progress: { ...settings.progress, radius: v } })}
          />
        </div>
        <SelectField
          label="Estilo"
          value={settings.progress.style}
          options={[
            { value: "gradient", label: "Gradiente" },
            { value: "solid", label: "Sólido" },
          ]}
          onChange={(v) => onChange({ progress: { ...settings.progress, style: v as any } })}
        />
        <p className="text-[11px] text-muted-foreground">
          A barra fica no topo do quiz e o percentual é calculado pela posição da seção.
        </p>
      </div>
    </div>
  );
}

export { GripVertical };
