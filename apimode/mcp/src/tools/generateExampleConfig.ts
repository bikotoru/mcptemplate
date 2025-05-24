import { apiClient } from "../utils/apiClient";
import { ResponseFormatter } from "../utils/responseFormatter";
import { ExampleConfigArgs, ToolResponse } from "../types";

export class GenerateExampleConfigTool {
  static getSchema() {
    return {
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
    };
  }

  static async execute(args: any): Promise<ToolResponse> {
    try {
      if (!args || !args.entityName) {
        throw new Error("entityName es requerido");
      }

      const typedArgs = args as ExampleConfigArgs;
      const entityName = typedArgs.entityName;
      const complexity = typedArgs.complexity || 'medium';

      let example: any;

      try {
        const response = await apiClient.post('/example-config', {
          entity_name: entityName,
          complexity: complexity
        });
        example = response.data.config;
      } catch (apiError) {
        // Fallback si la API no está disponible
        example = this.generateFallbackExample(entityName, complexity);
      }

      return ResponseFormatter.formatExampleConfig(entityName, complexity, example);
    } catch (error: any) {
      return ResponseFormatter.formatError(`Error generando configuración de ejemplo: ${error.message}`);
    }
  }

  private static generateFallbackExample(entityName: string, complexity: string): any {
    const name = entityName.toLowerCase();
    const pascalName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
    const pluralName = `${pascalName}s`;

    const baseConfig = {
      targetPath: `./src/modules/${name}`,
      entityName: pascalName,
      entityNamePlural: pluralName,
      apiEndpoint: `/api/${name}s`,
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true
      }
    };

    switch (complexity) {
      case 'simple':
        return {
          ...baseConfig,
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
          ]
        };

      case 'complex':
        return {
          ...baseConfig,
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
          relationEndpoints: {
            categoria: '/api/categorias'
          }
        };

      default: // medium
        return {
          ...baseConfig,
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
          ]
        };
    }
  }
}