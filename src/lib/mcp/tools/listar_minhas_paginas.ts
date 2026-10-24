import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
export default defineTool({ name:"listar_minhas_paginas",title:"Listar minhas páginas",description:"Lista até 50 páginas próprias e seus links de revisão.",inputSchema:{},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"listar_minhas_paginas",{}) });
