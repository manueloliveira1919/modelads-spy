import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
import { pageInput,preparePage } from "../content";
export default defineTool({ name:"editar_pagina",title:"Editar página",description:"Substitui conteúdo de um rascunho próprio com name e sections; recusa páginas publicadas.",inputSchema:{ id:z.string().uuid(), conteudo:pageInput },annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"editar_pagina",{...preparePage(input.conteudo),id:input.id}) });
