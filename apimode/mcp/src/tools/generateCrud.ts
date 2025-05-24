import { apiClient } from "../utils/apiClient";
import { ResponseFormatter } from "../utils/responseFormatter";
import { GenerateArgs, CRUDConfig, ToolResponse } from "../types";

export class GenerateCrudTool {
  static getSchema() {
    return {
      name: "generate_crud",
      description: "Genera un módulo CRUD completo para Next.js basado en configuración JSON",
      inputSchema: {
        type: "object",
        properties: {
          config: {
            type: "object",
            description: "Configuración completa para la generación del CRUD",
            properties: {
              targetPath: {
                type: "string",
                description: "Ruta donde se generará el módulo CRUD"
              },
              entityName: {
                type: "string",
                description: "Nombre de la entidad en PascalCase (ej: Producto)"
              },
              entityNamePlural: {
                type: "string",
                description: "Nombre plural de la entidad (ej: Productos)"
              },
              fields: {
                type: "array",
                description: "Array de campos de la entidad",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Nombre del campo" },
                    type: { 
                      type: "string", 
                      enum: ["text", "number", "email", "password", "select", "textarea", "date", "boolean", "file", "relation"],
                      description: "Tipo del campo" 
                    },
                    label: { type: "string", description: "Etiqueta para mostrar" },
                    required: { type: "boolean", description: "Si el campo es obligatorio" },
                    searchable: { type: "boolean", description: "Si se puede buscar por este campo" },
                    sortable: { type: "boolean", description: "Si se puede ordenar por este campo" },
                    filterable: { type: "boolean", description: "Si se puede filtrar por este campo" },
                    showInList: { type: "boolean", description: "Si se muestra en la tabla" },
                    placeholder: { type: "string", description: "Placeholder del campo" },
                    validation: {
                      type: "object",
                      description: "Reglas de validación",
                      properties: {
                        min: { type: "number" },
                        max: { type: "number" },
                        pattern: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        accept: { type: "string" }
                      }
                    },
                    relation: {
                      type: "object",
                      description: "Configuración para campos de relación",
                      properties: {
                        endpoint: { type: "string" },
                        displayField: { type: "string" },
                        valueField: { type: "string" },
                        searchFields: { type: "array", items: { type: "string" } },
                        multiple: { type: "boolean" },
                        preload: { type: "boolean" },
                        minChars: { type: "number" },
                        relationEntity: { type: "string" },
                        allowCreate: { type: "boolean" }
                      }
                    }
                  }
                }
              },
              apiEndpoint: {
                type: "string",
                description: "Endpoint base de la API (ej: /api/productos)"
              },
              relationEndpoints: {
                type: "object",
                description: "Endpoints específicos para campos de relación"
              },
              permissions: {
                type: "object",
                description: "Permisos CRUD",
                properties: {
                  create: { type: "boolean" },
                  read: { type: "boolean" },
                  update: { type: "boolean" },
                  delete: { type: "boolean" }
                }
              }
            },
            required: ["targetPath", "entityName", "entityNamePlural", "fields", "apiEndpoint", "permissions"]
          },
          options: {
            type: "object",
            description: "Opciones de generación",
            properties: {
              overwrite: { 
                type: "boolean", 
                description: "Sobrescribir archivos existentes", 
                default: false 
              },
              dryRun: { 
                type: "boolean", 
                description: "Solo mostrar lo que se generaría sin crear archivos", 
                default: false 
              },
              verbose: { 
                type: "boolean", 
                description: "Mostrar información detallada", 
                default: false 
              },
              skipValidation: { 
                type: "boolean", 
                description: "Omitir validación de configuración", 
                default: false 
              }
            }
          }
        },
        required: ["config"]
      }
    };
  }

  static async execute(args: any): Promise<ToolResponse> {
    try {
      const typedArgs = args as GenerateArgs;
      
      // Helper function to check if config is CRUDConfig type
      const isCRUDConfig = (obj: any): obj is CRUDConfig => {
        return obj && ('entityName' in obj || 'targetPath' in obj || 'apiEndpoint' in obj);
      };
      
      // Extraer configuración del formato MCP
      const config = typedArgs.config || typedArgs;
      
      const response = await apiClient.post('/generate', {
        entity_name: isCRUDConfig(config) ? config.entityName : typedArgs.entity_name,
        entity_name_plural: isCRUDConfig(config) ? config.entityNamePlural : typedArgs.entity_name_plural,
        fields: config.fields || typedArgs.fields,
        template_type: "crud",
        output_path: isCRUDConfig(config) ? config.targetPath : typedArgs.output_path,
        api_endpoint: isCRUDConfig(config) ? config.apiEndpoint : typedArgs.api_endpoint,
        permissions: config.permissions || typedArgs.permissions,
        options: typedArgs.options || {}
      });

      return ResponseFormatter.formatGenerationResult(response.data);
    } catch (error: any) {
      return ResponseFormatter.formatError(error.response?.data?.detail || error.message);
    }
  }
}