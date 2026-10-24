import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
import { pageInput,preparePage } from "../content";
export default defineTool({ name:"criar_pagina_de_venda",title:"Criar página de venda",description:"Cria rascunho no editor manual; conteúdo: name, template opcional ou sections [{type,content,style?}]. Não gera conteúdo nem cobra créditos.",inputSchema:{ conteudo:pageInput },annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"criar_pagina_de_venda",preparePage(input.conteudo)) });
