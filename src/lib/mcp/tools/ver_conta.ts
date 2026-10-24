import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
export default defineTool({ name:"ver_conta",title:"Ver plano da conta",description:"Consulta plano e limites da conta autorizada; não retorna dados pessoais, tokens ou créditos privados.",inputSchema:{},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"ver_conta",{}) });
