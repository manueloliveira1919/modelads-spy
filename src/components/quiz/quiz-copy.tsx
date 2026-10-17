import { useRef, useState } from "react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function useQuizCopy() {
  const [manual, setManual] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const select = () => { ref.current?.focus(); ref.current?.select(); };
  const copy = async (text: string, message = "Texto copiado.") => {
    if (await copyText(text)) toast.success(message);
    else setManual(text);
  };
  const copyDialog = <Dialog open={manual !== null} onOpenChange={open => { if (!open) setManual(null); }}>
    <DialogContent onOpenAutoFocus={event => { event.preventDefault(); select(); }} className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Copiar texto</DialogTitle><DialogDescription>Toque e segure para copiar</DialogDescription></DialogHeader>
      <Textarea ref={ref} aria-label="Texto para copiar manualmente" readOnly value={manual ?? ""} rows={10} />
      <Button variant="outline" onClick={select}>Selecionar tudo</Button>
    </DialogContent>
  </Dialog>;
  return { copy, copyDialog };
}