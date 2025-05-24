/**
 * Tipos principales para el generador CRUD de Next.js
 */

// Tipos de campo soportados
export type FieldType = 
  | 'text' 
  | 'number' 
  | 'email' 
  | 'password' 
  | 'select' 
  | 'textarea' 
  | 'date' 
  | 'boolean' 
  | 'file' 
  | 'relation';

// Configuración de validación para campos
export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
  accept?: string; // Para archivos (mime types)
}

// Configuración de relaciones entre entidades
export interface FieldRelation {
  endpoint: string;
  displayField: string;
  valueField: string;
  searchFields: string[];
  multiple: boolean;
  preload: boolean;
  minChars: number;
  relationEntity: string;
  allowCreate: boolean;
}

// Definición de un campo de entidad
export interface EntityField {
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  validation?: FieldValidation;
  relation?: FieldRelation;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
  showInList: boolean;
  placeholder?: string;
}

// Permisos CRUD
export interface CRUDPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

// Configuración completa para generar un CRUD
export interface CRUDGeneratorConfig {
  targetPath: string;
  entityName: string;
  entityNamePlural: string;
  fields: EntityField[];
  apiEndpoint: string;
  relationEndpoints?: Record<string, string>;
  permissions: CRUDPermissions;
}

// Resultado de la generación
export interface GenerationResult {
  success: boolean;
  message: string;
  filesCreated: string[];
  errors?: string[];
  warnings?: string[];
}

// Opciones para el generador
export interface GeneratorOptions {
  overwrite?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  skipValidation?: boolean;
}

// Contexto del template para Handlebars
export interface TemplateContext {
  ENTITY_NAME: string;
  ENTITY_NAME_LOWER: string;
  ENTITY_NAME_UPPER: string;
  ENTITY_NAME_PLURAL: string;
  ENTITY_NAME_PLURAL_LOWER: string;
  API_ENDPOINT: string;
  FIELDS: EntityField[];
  PERMISSIONS: CRUDPermissions;
  RELATION_ENDPOINTS: Record<string, string>;
  TIMESTAMP: string;
  VERSION: string;
}

// Metadatos de archivos generados
export interface GeneratedFile {
  path: string;
  type: 'component' | 'page' | 'api' | 'type' | 'hook' | 'validation' | 'other';
  description: string;
  dependencies?: string[];
}

// Configuración del MCP
export interface MCPConfig {
  templatesPath: string;
  outputPath: string;
  defaultPermissions: CRUDPermissions;
  supportedFieldTypes: FieldType[];
  requiredDependencies: string[];
}

// Errores personalizados
export class CRUDGeneratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CRUDGeneratorError';
  }
}

// Tipos para validación
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// Helper types para TypeScript templates
export type TypeScriptType = 'string' | 'number' | 'boolean' | 'Date' | 'File' | 'any';

export interface TypeMapping {
  [key: string]: TypeScriptType;
}

// Configuración de dependencias
export interface DependencyConfig {
  name: string;
  version: string;
  required: boolean;
  description: string;
}

export interface ProjectDependencies {
  dependencies: DependencyConfig[];
  devDependencies: DependencyConfig[];
}
