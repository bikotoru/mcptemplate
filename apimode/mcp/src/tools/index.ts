import { GenerateCrudTool } from "./generateCrud";
import { ValidateConfigTool } from "./validateConfig";
import { GetFieldTypesTool } from "./getFieldTypes";
import { GenerateExampleConfigTool } from "./generateExampleConfig";
import { ToolResponse } from "../types";

export interface MCPTool {
  getSchema(): any;
  execute(args: any): Promise<ToolResponse>;
}

export const tools: Record<string, MCPTool> = {
  generate_crud: GenerateCrudTool,
  validate_config: ValidateConfigTool,
  get_field_types: GetFieldTypesTool,
  generate_example_config: GenerateExampleConfigTool
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
  GenerateExampleConfigTool
};