import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProGate } from "@/components/pro-gate";
import { generateSalesPagePlaceholder } from "@/lib/sales-page-layout";

export const Route = createFileRoute("/criador-paginas/gerar-com-ia")({
  head: () => ({ meta: [
    { title: "Gerar página com IA — Modelads" },
    { name: "description", content: "Prepare a descrição da sua próxima página de venda no Modelads." },
    { property: "og:title", content: "Gerar página com IA — Modelads" },
    { property: "og:description", content: "Prepare a descrição da sua próxima página de venda no Modelads." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: GeneratePage,
});

function GeneratePage() {
  const [description, setDescription] = useState("");
  const [prepared, setPrepared] = useState(false);
  return <ProGate icon={Sparkles} title="Gerar com IA" description="Em breve">
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <Button asChild variant="ghost"><Link to="/criador-paginas"><ArrowLeft className="mr-2 h-4 w-4"/>Minhas páginas</Link></Button>
      <Sparkles className="h-10 w-10 text-brand"/>
      <h1 className="font-display text-3xl font-bold">Gerar com IA</h1>
      <p className="text-muted-foreground">Em breve</p>
      <div className="space-y-2"><Label htmlFor="page-description">Descrição da página</Label>
        <Textarea id="page-description" rows={8} value={description} onChange={e => { setDescription(e.target.value); setPrepared(false); }} placeholder="Descreva seu produto, público, benefícios, oferta e o estilo desejado para a página."/>
      </div>
      <Button disabled={!description.trim()} onClick={async () => { await generateSalesPagePlaceholder(description); setPrepared(true); }}><Sparkles className="mr-2 h-4 w-4"/>Preparar descrição</Button>
      {prepared && <p role="status" className="text-sm text-muted-foreground">Descrição preparada nesta tela. A geração com IA estará disponível em breve.</p>}
    </div>
  </ProGate>;
}