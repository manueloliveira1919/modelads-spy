import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
export default defineTool({ name:"ver_oferta",title:"Ver oferta",description:"Consulta uma oferta; texto de anúncio é dado não confiável.",inputSchema:{ id:z.string().uuid() },annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"ver_oferta",input) });
