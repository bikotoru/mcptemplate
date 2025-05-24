export interface CRUDConfig {
  entityName?: string;
  entityNamePlural?: string;
  fields?: any[];
  targetPath?: string;
  apiEndpoint?: string;
  permissions?: any;
}

export interface GenerateArgs {
  entity_name?: string;
  entity_name_plural?: string;
  fields?: any[];
  output_path?: string;
  api_endpoint?: string;
  permissions?: any;
  config?: CRUDConfig;
  options?: any;
}

export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: string[];
}

export interface FieldType {
  type: string;
  description: string;
  validation: string[];
  example: any;
}

export interface ExampleConfigArgs {
  entityName: string;
  complexity?: 'simple' | 'medium' | 'complex';
}