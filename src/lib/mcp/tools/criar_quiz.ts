import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
import { prepareQuiz } from "../content";
export default defineTool({ name:"criar_quiz",title:"Criar quiz",description:"Cria rascunho manual com template JSON modelads-quiz-template versão 1: name, settings, sections com key,name,elements type/content/settings. Não gera conteúdo nem cobra créditos.",inputSchema:{ template:z.string().max(1048576).describe("JSON portátil modelads-quiz-template v1, igual ao importador do Quiz.") },annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"criar_quiz",prepareQuiz(input.template)) });
