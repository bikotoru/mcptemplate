#!/usr/bin/env node

/**
 * MCP Server para generación CRUD de Next.js
 * Modelo Context Protocol implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CRUDGenerator } from './generators/index.js';
import { CRUDValidator, crudGeneratorConfigSchema } from './validators/index.js';
import { Logger } from './utils/index.js';
import type { CRUDGeneratorConfig, GeneratorOptions } from './types/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener ruta del directorio actual para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuración del servidor MCP
 */
class NextjsCRUDMCPServer {
  private server: Server;
  private generator: CRUDGenerator;

  constructor() {
    // Configurar server MCP
    this.server = new Server(
      {
        name: 'nextjs-crud-generator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Inicializar generador
    const templatesPath = path.join(__dirname, 'templates', 'crud');
    this.generator = new CRUDGenerator(templatesPath);

    this.setupHandlers();
  }

  /**
   * Configura los handlers del servidor MCP
   */
  private setupHandlers(): void {
    // Handler para listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_crud',
            description: 'Genera un módulo CRUD completo para Next.js basado en configuración JSON',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  description: 'Configuración completa para la generación del CRUD',
                  properties: {
                    targetPath: {
                      type: 'string',
                      description: 'Ruta donde se generará el módulo CRUD'
                    },
                    entityName: {
                      type: 'string',
                      description: 'Nombre de la entidad en PascalCase (ej: Producto)'
                    },
                    entityNamePlural: {
                      type: 'string',
                      description: 'Nombre plural de la entidad (ej: Productos)'
                    },
                    fields: {
                      type: 'array',
                      description: 'Array de campos de la entidad',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: 'Nombre del campo' },
                          type: { 
                            type: 'string', 
                            enum: ['text', 'number', 'email', 'password', 'select', 'textarea', 'date', 'boolean', 'file', 'relation'],
                            description: 'Tipo del campo' 
                          },
                          label: { type: 'string', description: 'Etiqueta para mostrar' },
                          required: { type: 'boolean', description: 'Si el campo es obligatorio' },
                          searchable: { type: 'boolean', description: 'Si se puede buscar por este campo' },
                          sortable: { type: 'boolean', description: 'Si se puede ordenar por este campo' },
                          filterable: { type: 'boolean', description: 'Si se puede filtrar por este campo' },
                          showInList: { type: 'boolean', description: 'Si se muestra en la tabla' },
                          placeholder: { type: 'string', description: 'Placeholder del campo' },
                          validation: {
                            type: 'object',
                            description: 'Reglas de validación',
                            properties: {
                              min: { type: 'number' },
                              max: { type: 'number' },
                              pattern: { type: 'string' },
                              options: { type: 'array', items: { type: 'string' } },
                              accept: { type: 'string' }
                            }
                          },
                          relation: {
                            type: 'object',
                            description: 'Configuración para campos de relación',
                            properties: {
                              endpoint: { type: 'string' },
                              displayField: { type: 'string' },
                              valueField: { type: 'string' },
                              searchFields: { type: 'array', items: { type: 'string' } },
                              multiple: { type: 'boolean' },
                              preload: { type: 'boolean' },
                              minChars: { type: 'number' },
                              relationEntity: { type: 'string' },
                              allowCreate: { type: 'boolean' }
                            }
                          }
                        }
                      }
                    },
                    apiEndpoint: {
                      type: 'string',
                      description: 'Endpoint base de la API (ej: /api/productos)'
                    },
                    relationEndpoints: {
                      type: 'object',
                      description: 'Endpoints específicos para campos de relación'
                    },
                    permissions: {
                      type: 'object',
                      description: 'Permisos CRUD',
                      properties: {
                        create: { type: 'boolean' },
                        read: { type: 'boolean' },
                        update: { type: 'boolean' },
                        delete: { type: 'boolean' }
                      }
                    }
                  },
                  required: ['targetPath', 'entityName', 'entityNamePlural', 'fields', 'apiEndpoint', 'permissions']
                },
                options: {
                  type: 'object',
                  description: 'Opciones de generación',
                  properties: {
                    overwrite: { 
                      type: 'boolean', 
                      description: 'Sobrescribir archivos existentes', 
                      default: false 
                    },
                    dryRun: { 
                      type: 'boolean', 
                      description: 'Solo mostrar lo que se generaría sin crear archivos', 
                      default: false 
                    },
                    verbose: { 
                      type: 'boolean', 
                      description: 'Mostrar información detallada', 
                      default: false 
                    },
                    skipValidation: { 
                      type: 'boolean', 
                      description: 'Omitir validación de configuración', 
                      default: false 
                    }
                  }
                }
              },
              required: ['config']
            }
          },
          {
            name: 'validate_config',
            description: 'Valida una configuración CRUD sin generar archivos',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  description: 'Configuración a validar'
                }
              },
              required: ['config']
            }
          },
          {
            name: 'get_field_types',
            description: 'Obtiene información sobre los tipos de campo disponibles',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'generate_example_config',
            description: 'Genera un ejemplo de configuración para una entidad específica',
            inputSchema: {
              type: 'object',
              properties: {
                entityName: {
                  type: 'string',
                  description: 'Nombre de la entidad para el ejemplo'
                },
                complexity: {
                  type: 'string',
                  enum: ['simple', 'medium', 'complex'],
                  description: 'Nivel de complejidad del ejemplo',
                  default: 'medium'
                }
              },
              required: ['entityName']
            }
          }
        ]
      };
    });

    // Handler para ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_crud':
            return await this.handleGenerateCRUD(args);
          
          case 'validate_config':
            return await this.handleValidateConfig(args);
          
          case 'get_field_types':
            return await this.handleGetFieldTypes();
          
          case 'generate_example_config':
            return await this.handleGenerateExampleConfig(args);
          
          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        Logger.error(`Error en herramienta ${name}: ${message}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${message}`
            }
          ]
        };
      }
    });
  }

  /**
   * Handler para generar CRUD
   */
  private async handleGenerateCRUD(args: any) {
    // El MCP inspector anida los argumentos doble, extraer correctamente
    const actualConfig = args.config?.config || args.config;
    const actualOptions = args.config?.options || args.options || {};
    
    // Validar argumentos
    const configSchema = crudGeneratorConfigSchema;
    const optionsSchema = z.object({
      overwrite: z.boolean().default(false),
      dryRun: z.boolean().default(false),
      verbose: z.boolean().default(false),
      skipValidation: z.boolean().default(false)
    }).default({});

    const config = configSchema.parse(actualConfig);
    const options = optionsSchema.parse(actualOptions);

    // Verificar templates
    const templatesValid = await this.generator.validateTemplatesPath();
    if (!templatesValid) {
      throw new Error('Templates no encontrados o inválidos');
    }

    // Generar CRUD
    const result = await this.generator.generate(config, options);

    // Formatear respuesta
    let responseText = `# Resultado de Generación CRUD

## Estado: ${result.success ? '✅ Exitoso' : '❌ Error'}

**Mensaje:** ${result.message}

`;

    if (result.filesCreated.length > 0) {
      responseText += `## Archivos Generados (${result.filesCreated.length})

${result.filesCreated.map(file => `- \`${file}\``).join('\n')}

`;
    }

    if (result.errors && result.errors.length > 0) {
      responseText += `## Errores

${result.errors.map(error => `- ${error}`).join('\n')}

`;
    }

    if (options.dryRun) {
      responseText += `> **Nota:** Ejecutado en modo dry-run. No se crearon archivos reales.

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
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * Handler para validar configuración
   */
  private async handleValidateConfig(args: any) {
    const { config } = args;

    const validation = CRUDValidator.validate(config);

    let responseText = `# Validación de Configuración CRUD

## Estado: ${validation.valid ? '✅ Válida' : '❌ Inválida'}

`;

    if (!validation.valid) {
      responseText += `## Errores Encontrados

${validation.errors.map(error => `- **${error.field}:** ${error.message}`).join('\n')}

`;
    }

    if (validation.warnings.length > 0) {
      responseText += `## Advertencias

${validation.warnings.map(warning => `- ${warning}`).join('\n')}

`;
    }

    if (validation.valid) {
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
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * Handler para obtener tipos de campo
   */
  private async handleGetFieldTypes() {
    const fieldTypes = [
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

${fieldTypes.map(fieldType => `## ${fieldType.type}

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
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * Handler para generar configuración de ejemplo
   */
  private async handleGenerateExampleConfig(args: any) {
    const { entityName, complexity = 'medium' } = args;

    const examples = {
      simple: this.generateSimpleExample(entityName),
      medium: this.generateMediumExample(entityName),
      complex: this.generateComplexExample(entityName)
    };

    const example = examples[complexity as keyof typeof examples];

    const responseText = `# Configuración de Ejemplo: ${entityName}

## Nivel de Complejidad: ${complexity}

\`\`\`json
${JSON.stringify(example, null, 2)}
\`\`\`

## Cómo Usar Esta Configuración

1. Copia la configuración JSON de arriba
2. Ajusta los campos según tus necesidades específicas
3. Modifica los endpoints de la API
4. Ejecuta el generador CRUD con esta configuración

## Campos Incluidos en Este Ejemplo

${example.fields.map((field: any) => `- **${field.label}** (${field.type}): ${field.required ? 'Requerido' : 'Opcional'}`).join('\n')}

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
          type: 'text',
          text: responseText
        }
      ]
    };
  }

  /**
   * Genera ejemplo simple
   */
  private generateSimpleExample(entityName: string) {
    const name = entityName.toLowerCase();
    const pascalName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
    const pluralName = `${pascalName}s`;

    return {
      targetPath: `./src/modules/${name}`,
      entityName: pascalName,
      entityNamePlural: pluralName,
      fields: [
        {
          name: 'nombre',
          type: 'text',
          label: 'Nombre',
          required: true,
          validation: { min: 2, max: 100 },
          searchable: true,
          sortable: true,
          filterable: true,
          showInList: true,
          placeholder: `Nombre del ${name}`
        },
        {
          name: 'activo',
          type: 'boolean',
          label: 'Activo',
          required: true,
          searchable: false,
          sortable: true,
          filterable: true,
          showInList: true
        }
      ],
      apiEndpoint: `/api/${name}s`,
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true
      }
    };
  }

  /**
   * Genera ejemplo medio
   */
  private generateMediumExample(entityName: string) {
    const name = entityName.toLowerCase();
    const pascalName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
    const pluralName = `${pascalName}s`;

    return {
      targetPath: `./src/modules/${name}`,
      entityName: pascalName,
      entityNamePlural: pluralName,
      fields: [
        {
          name: 'nombre',
          type: 'text',
          label: 'Nombre',
          required: true,
          validation: { min: 2, max: 100 },
          searchable: true,
          sortable: true,
          filterable: true,
          showInList: true,
          placeholder: `Nombre del ${name}`
        },
        {
          name: 'descripcion',
          type: 'textarea',
          label: 'Descripción',
          required: false,
          validation: { max: 500 },
          searchable: true,
          sortable: false,
          filterable: false,
          showInList: false,
          placeholder: 'Descripción opcional'
        },
        {
          name: 'email',
          type: 'email',
          label: 'Email',
          required: true,
          searchable: true,
          sortable: true,
          filterable: false,
          showInList: true,
          placeholder: 'correo@ejemplo.com'
        },
        {
          name: 'estado',
          type: 'select',
          label: 'Estado',
          required: true,
          validation: { options: ['activo', 'inactivo', 'pendiente'] },
          searchable: false,
          sortable: true,
          filterable: true,
          showInList: true
        },
        {
          name: 'fechaCreacion',
          type: 'date',
          label: 'Fecha de Creación',
          required: true,
          searchable: false,
          sortable: true,
          filterable: true,
          showInList: true
        }
      ],
      apiEndpoint: `/api/${name}s`,
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true
      }
    };
  }

  /**
   * Genera ejemplo complejo
   */
  private generateComplexExample(entityName: string) {
    const name = entityName.toLowerCase();
    const pascalName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
    const pluralName = `${pascalName}s`;

    return {
      targetPath: `./src/modules/${name}`,
      entityName: pascalName,
      entityNamePlural: pluralName,
      fields: [
        {
          name: 'nombre',
          type: 'text',
          label: 'Nombre',
          required: true,
          validation: { min: 2, max: 100 },
          searchable: true,
          sortable: true,
          filterable: true,
          showInList: true,
          placeholder: `Nombre del ${name}`
        },
        {
          name: 'descripcion',
          type: 'textarea',
          label: 'Descripción',
          required: false,
          validation: { max: 1000 },
          searchable: true,
          sortable: false,
          filterable: false,
          showInList: false,
          placeholder: 'Descripción detallada'
        },
        {
          name: 'categoria',
          type: 'relation',
          label: 'Categoría',
          required: true,
          searchable: true,
          sortable: true,
          filterable: true,
          showInList: true,
          placeholder: 'Selecciona una categoría',
          relation: {
            endpoint: '/api/categorias/search',
            displayField: 'nombre',
            valueField: 'id',
            searchFields: ['nombre', 'codigo'],
            multiple: false,
            preload: false,
            minChars: 2,
            relationEntity: 'Categoria',
            allowCreate: true
          }
        },
        {
          name: 'tags',
          type: 'relation',
          label: 'Etiquetas',
          required: false,
          searchable: false,
          sortable: false,
          filterable: true,
          showInList: true,
          placeholder: 'Selecciona etiquetas',
          relation: {
            endpoint: '/api/tags/search',
            displayField: 'nombre',
            valueField: 'id',
            searchFields: ['nombre'],
            multiple: true,
            preload: true,
            minChars: 1,
            relationEntity: 'Tag',
            allowCreate: false
          }
        },
        {
          name: 'precio',
          type: 'number',
          label: 'Precio',
          required: true,
          validation: { min: 0 },
          searchable: false,
          sortable: true,
          filterable: true,
          showInList: true,
          placeholder: '0.00'
        },
        {
          name: 'imagen',
          type: 'file',
          label: 'Imagen',
          required: false,
          validation: { accept: 'image/*' },
          searchable: false,
          sortable: false,
          filterable: false,
          showInList: false
        },
        {
          name: 'activo',
          type: 'boolean',
          label: 'Activo',
          required: true,
          searchable: false,
          sortable: true,
          filterable: true,
          showInList: true
        }
      ],
      apiEndpoint: `/api/${name}s`,
      relationEndpoints: {
        categoria: '/api/categorias',
        tags: '/api/tags'
      },
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true
      }
    };
  }

  /**
   * Inicia el servidor MCP
   */
  async start(): Promise<void> {
    // Desactivar logs para MCP (stdout debe ser solo JSON)
    Logger.setEnabled(false);
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Iniciar servidor si se ejecuta directamente
const isMain = process.argv[1] && (
  process.argv[1].endsWith('index.ts') || 
  process.argv[1].endsWith('index.js') ||
  import.meta.url === `file://${process.argv[1]}`
);

if (isMain) {
  const server = new NextjsCRUDMCPServer();
  
  server.start().catch((error) => {
    Logger.error(`Error iniciando servidor MCP: ${error.message}`);
    process.exit(1);
  });
}

export { NextjsCRUDMCPServer };
export default NextjsCRUDMCPServer;
