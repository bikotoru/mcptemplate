#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Types for the configuration
interface CRUDConfig {
  entityName?: string;
  entityNamePlural?: string;
  fields?: any[];
  targetPath?: string;
  apiEndpoint?: string;
  permissions?: any;
}

interface GenerateArgs {
  entity_name?: string;
  entity_name_plural?: string;
  fields?: any[];
  output_path?: string;
  api_endpoint?: string;
  permissions?: any;
  config?: CRUDConfig;
  options?: any;
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

const server = new Server(
  {
    name: "mcp-creator-bridge",
    version: "1.0.0",
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
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
        },
      },
      {
        name: "validate_config",
        description: "Valida una configuración CRUD sin generar archivos",
        inputSchema: {
          type: "object",
          properties: {
            config: {
              type: "object",
              description: "Configuración a validar"
            }
          },
          required: ["config"]
        }
      },
      {
        name: "get_field_types",
        description: "Obtiene información sobre los tipos de campo disponibles",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "generate_example_config",
        description: "Genera un ejemplo de configuración para una entidad específica",
        inputSchema: {
          type: "object",
          properties: {
            entityName: {
              type: "string",
              description: "Nombre de la entidad para el ejemplo"
            },
            complexity: {
              type: "string",
              enum: ["simple", "medium", "complex"],
              description: "Nivel de complejidad del ejemplo",
              default: "medium"
            }
          },
          required: ["entityName"]
        }
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "generate_crud":
    try {
      // Type assertion for args
      const typedArgs = args as GenerateArgs;
      
      // Helper function to check if config is CRUDConfig type
      const isCRUDConfig = (obj: any): obj is CRUDConfig => {
        return obj && ('entityName' in obj || 'targetPath' in obj || 'apiEndpoint' in obj);
      };
      
      // Extraer configuración del formato MCP
      const config = typedArgs.config || typedArgs;
      
      const response = await axios.post(`${API_BASE_URL}/generate`, {
        entity_name: isCRUDConfig(config) ? config.entityName : typedArgs.entity_name,
        entity_name_plural: isCRUDConfig(config) ? config.entityNamePlural : typedArgs.entity_name_plural,
        fields: config.fields || typedArgs.fields,
        template_type: "crud",
        output_path: isCRUDConfig(config) ? config.targetPath : typedArgs.output_path,
        api_endpoint: isCRUDConfig(config) ? config.apiEndpoint : typedArgs.api_endpoint,
        permissions: config.permissions || typedArgs.permissions,
        options: typedArgs.options || {}
      });

      // Formatear respuesta al estilo del MCP original
      let responseText = `# Resultado de Generación CRUD

## Estado: ${response.data.success ? '✅ Exitoso' : '❌ Error'}

**Mensaje:** ${response.data.message}

`;

      if (response.data.generated_files && response.data.generated_files.length > 0) {
        responseText += `## Archivos Generados (${response.data.generated_files.length})

${response.data.generated_files.map((file: string) => `- \`${file}\``).join('\n')}

`;
      }

      if (response.data.errors && response.data.errors.length > 0) {
        responseText += `## Errores

${response.data.errors.map((error: string) => `- ${error}`).join('\n')}

`;
      }

      responseText += `## Siguientes Pasos

1. Instalar dependencias requeridas:
   \`\`\`bash
   npm install @tanstack/react-query @tanstack/react-table react-hook-form @hookform/resolvers zod date-fns @heroicons/react
   \`\`\`

2. Configurar tu base de datos en las rutas API generadas
3. Personalizar los componentes según tu sistema de diseño
4. Configurar autenticación si es necesario

## Estructura Generada

- **Componentes:** Lista, Formulario, Tabla, Filtros, Búsqueda
- **Páginas:** Index, Crear, Editar
- **API Routes:** CRUD completo con validación
- **Types:** Interfaces TypeScript completas
- **Hooks:** React Query hooks optimizados
- **Validación:** Esquemas Zod para formularios y API
`;

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.response?.data?.detail || error.message}`,
          },
        ],
        isError: true,
      };
    }

    case "validate_config":
      try {
        if (!args) {
          throw new Error("No arguments provided");
        }
        const response = await axios.post(`${API_BASE_URL}/validate`, {
          config: (args as any).config
        });

        let responseText = `# Validación de Configuración CRUD

## Estado: ${response.data.valid ? '✅ Válida' : '❌ Inválida'}

`;

        if (!response.data.valid && response.data.errors) {
          responseText += `## Errores Encontrados

${response.data.errors.map((error: any) => `- **${error.field}:** ${error.message}`).join('\n')}

`;
        }

        if (response.data.warnings && response.data.warnings.length > 0) {
          responseText += `## Advertencias

${response.data.warnings.map((warning: string) => `- ${warning}`).join('\n')}

`;
        }

        if (response.data.valid) {
          const config = (args as any).config as any;
          responseText += `## Resumen de Configuración

- **Entidad:** ${config.entityName} (${config.entityNamePlural})
- **Campos:** ${config.fields?.length || 0}
- **API Endpoint:** ${config.apiEndpoint}
- **Permisos:** ${Object.entries(config.permissions || {}).filter(([_, enabled]) => enabled).map(([action]) => action).join(', ')}

### Análisis de Campos

${config.fields?.map((field: any) => {
  const capabilities = [];
  if (field.searchable) capabilities.push('Búsqueda');
  if (field.sortable) capabilities.push('Ordenamiento');
  if (field.filterable) capabilities.push('Filtrado');
  if (field.showInList) capabilities.push('Lista');
  
  return `- **${field.label}** (${field.type}): ${capabilities.join(', ') || 'Solo visualización'}`;
}).join('\n') || 'No hay campos definidos'}
`;
        }

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error validando configuración: ${error.response?.data?.detail || error.message}`,
            },
          ],
          isError: true,
        };
      }

    case "get_field_types":
      try {
        const response = await axios.get(`${API_BASE_URL}/field-types`);

        const fieldTypes = response.data.field_types || [
          {
            type: 'text',
            description: 'Texto simple',
            validation: ['min', 'max', 'pattern'],
            example: { name: 'nombre', type: 'text', label: 'Nombre', required: true }
          },
          {
            type: 'email',
            description: 'Dirección de correo electrónico',
            validation: ['pattern (automático)'],
            example: { name: 'email', type: 'email', label: 'Email', required: true }
          },
          {
            type: 'password',
            description: 'Contraseña (oculta al escribir)',
            validation: ['min', 'max', 'pattern'],
            example: { name: 'password', type: 'password', label: 'Contraseña', required: true }
          },
          {
            type: 'number',
            description: 'Número entero o decimal',
            validation: ['min', 'max'],
            example: { name: 'precio', type: 'number', label: 'Precio', required: true }
          },
          {
            type: 'textarea',
            description: 'Texto largo (múltiples líneas)',
            validation: ['min', 'max'],
            example: { name: 'descripcion', type: 'textarea', label: 'Descripción', required: false }
          },
          {
            type: 'select',
            description: 'Lista desplegable de opciones',
            validation: ['options (requerido)'],
            example: { 
              name: 'estado', 
              type: 'select', 
              label: 'Estado', 
              required: true,
              validation: { options: ['activo', 'inactivo'] }
            }
          },
          {
            type: 'boolean',
            description: 'Verdadero/Falso (checkbox)',
            validation: [],
            example: { name: 'activo', type: 'boolean', label: 'Activo', required: true }
          },
          {
            type: 'date',
            description: 'Fecha (selector de calendario)',
            validation: [],
            example: { name: 'fechaCreacion', type: 'date', label: 'Fecha de Creación', required: true }
          },
          {
            type: 'file',
            description: 'Archivo (upload)',
            validation: ['accept (tipos MIME)'],
            example: { 
              name: 'imagen', 
              type: 'file', 
              label: 'Imagen', 
              required: false,
              validation: { accept: 'image/*' }
            }
          },
          {
            type: 'relation',
            description: 'Relación con otra entidad',
            validation: ['relation (configuración completa requerida)'],
            example: {
              name: 'categoria',
              type: 'relation',
              label: 'Categoría',
              required: true,
              relation: {
                endpoint: '/api/categorias/search',
                displayField: 'nombre',
                valueField: 'id',
                searchFields: ['nombre'],
                multiple: false,
                preload: false,
                minChars: 2,
                relationEntity: 'Categoria',
                allowCreate: false
              }
            }
          }
        ];

        let responseText = `# Tipos de Campo Disponibles

${fieldTypes.map((fieldType: any) => `## ${fieldType.type}

**Descripción:** ${fieldType.description}

**Validaciones disponibles:** ${fieldType.validation.length > 0 ? fieldType.validation.join(', ') : 'Ninguna'}

**Ejemplo:**
\`\`\`json
${JSON.stringify(fieldType.example, null, 2)}
\`\`\`

`).join('\n')}

## Propiedades Comunes para Todos los Campos

- **name**: Nombre del campo (camelCase, requerido)
- **type**: Tipo del campo (requerido)
- **label**: Etiqueta para mostrar (requerido)
- **required**: Si el campo es obligatorio (boolean, requerido)
- **searchable**: Si se puede buscar por este campo (boolean, requerido)
- **sortable**: Si se puede ordenar por este campo (boolean, requerido)
- **filterable**: Si se puede filtrar por este campo (boolean, requerido)
- **showInList**: Si se muestra en la tabla (boolean, requerido)
- **placeholder**: Texto de placeholder (opcional)

## Configuración de Relaciones

Para campos de tipo \`relation\`, la configuración completa es:

\`\`\`json
{
  "relation": {
    "endpoint": "/api/entidad/search",
    "displayField": "nombre",
    "valueField": "id", 
    "searchFields": ["nombre", "codigo"],
    "multiple": false,
    "preload": false,
    "minChars": 2,
    "relationEntity": "NombreEntidad",
    "allowCreate": false
  }
}
\`\`\`
`;

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error: any) {
        // Fallback si la API no está disponible
        return {
          content: [
            {
              type: "text",
              text: `Error obteniendo tipos de campo: ${error.response?.data?.detail || error.message}. Usando información por defecto.`,
            },
          ],
        };
      }

    case "generate_example_config":
      try {
        if (!args) {
          throw new Error("No arguments provided");
        }
        const typedArgs = args as { entityName?: string; complexity?: string };
        const response = await axios.post(`${API_BASE_URL}/example-config`, {
          entity_name: typedArgs.entityName,
          complexity: typedArgs.complexity || 'medium'
        });

        const example = response.data.config;

        const responseText = `# Configuración de Ejemplo: ${typedArgs.entityName}

## Nivel de Complejidad: ${typedArgs.complexity || 'medium'}

\`\`\`json
${JSON.stringify(example, null, 2)}
\`\`\`

## Cómo Usar Esta Configuración

1. Copia la configuración JSON de arriba
2. Ajusta los campos según tus necesidades específicas
3. Modifica los endpoints de la API
4. Ejecuta el generador CRUD con esta configuración

## Campos Incluidos en Este Ejemplo

${example.fields?.map((field: any) => `- **${field.label}** (${field.type}): ${field.required ? 'Requerido' : 'Opcional'}`).join('\n') || 'No hay campos'}

## Personalización

Puedes personalizar esta configuración:

- Agregar o quitar campos
- Cambiar tipos de campo
- Ajustar validaciones
- Modificar permisos
- Configurar relaciones específicas
`;

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error generando configuración de ejemplo: ${error.response?.data?.detail || error.message}`,
            },
          ],
          isError: true,
        };
      }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});