import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
import { prepareQuiz } from "../content";
export default defineTool({ name:"editar_quiz",title:"Editar quiz",description:"Substitui seções de um quiz próprio em rascunho com template JSON portátil validado; recusa publicados.",inputSchema:{ id:z.string().uuid(), template:z.string().max(1048576) },annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"editar_quiz",prepareQuiz(input.template,input.id)) });
