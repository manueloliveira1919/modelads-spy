import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { command } from "../command";
export default defineTool({ name:"listar_meus_quiz",title:"Listar meus quizzes",description:"Lista até 50 quizzes próprios e links de revisão, sem leads.",inputSchema:{},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},handler:(input,ctx)=>command(ctx,"listar_meus_quiz",{}) });
