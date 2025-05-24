import { GenerateCrudTool } from "./generateCrud.js";
import { ValidateConfigTool } from "./validateConfig.js";
import { GetFieldTypesTool } from "./getFieldTypes.js";
import { GenerateExampleConfigTool } from "./generateExampleConfig.js";
import { ExecuteSqlTool } from "./executeSql.js";
import { GetDatabaseInfoTool } from "./getDatabaseInfo.js";
import { ToolResponse } from "../types/index.js";

export interface MCPTool {
  getSchema(): any;
  execute(args: any): Promise<ToolResponse>;
}

export const tools: Record<string, MCPTool> = {
  generate_crud: GenerateCrudTool,
  validate_config: ValidateConfigTool,
  get_field_types: GetFieldTypesTool,
  generate_example_config: GenerateExampleConfigTool,
  execute_sql: ExecuteSqlTool,
  get_database_info: GetDatabaseInfoTool
};

export function getToolSchemas() {
  return Object.values(tools).map(tool => tool.getSchema());
}

export async function executeTool(name: string, args: any): Promise<ToolResponse> {
  const tool = tools[name];
  if (!tool) {
    return {
      content: [{
        type: "text" as const,
        text: `DEBUG: Tool no encontrado: ${name}. Tools disponibles: ${Object.keys(tools).join(', ')}`
      }],
      isError: true
    };
  }
  
  // Agregar debug info al principio
  try {
    const result = await tool.execute(args);
    
    // Agregar info de debug al resultado exitoso
    if (result.content && result.content[0] && result.content[0].type === "text") {
      result.content[0].text = `DEBUG: executeTool llamado exitosamente con tool: ${name}\n\n${result.content[0].text}`;
    }
    
    return result;
  } catch (error: any) {
    return {
      content: [{
        type: "text" as const,
        text: `DEBUG: Error en executeTool con tool: ${name}\nError: ${error.message}\nStack: ${error.stack}`
      }],
      isError: true
    };
  }
}

export {
  GenerateCrudTool,
  ValidateConfigTool,
  GetFieldTypesTool,
  GenerateExampleConfigTool,
  ExecuteSqlTool,
  GetDatabaseInfoTool
};