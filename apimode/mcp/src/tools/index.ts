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
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.execute(args);
}

export {
  GenerateCrudTool,
  ValidateConfigTool,
  GetFieldTypesTool,
  GenerateExampleConfigTool,
  ExecuteSqlTool,
  GetDatabaseInfoTool
};