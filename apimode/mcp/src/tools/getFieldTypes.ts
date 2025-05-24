import { apiClient } from "../utils/apiClient";
import { ResponseFormatter } from "../utils/responseFormatter";
import { ToolResponse, FieldType } from "../types";

export class GetFieldTypesTool {
  static getSchema() {
    return {
      name: "get_field_types",
      description: "Obtiene información sobre los tipos de campo disponibles",
      inputSchema: {
        type: "object",
        properties: {}
      }
    };
  }

  static async execute(args: any): Promise<ToolResponse> {
    try {
      let fieldTypes: FieldType[];

      try {
        const response = await apiClient.get('/field-types');
        fieldTypes = response.data.field_types;
      } catch (apiError) {
        // Fallback si la API no está disponible
        fieldTypes = this.getDefaultFieldTypes();
      }

      return ResponseFormatter.formatFieldTypes(fieldTypes);
    } catch (error: any) {
      return ResponseFormatter.formatError(`Error obteniendo tipos de campo: ${error.message}`);
    }
  }

  private static getDefaultFieldTypes(): FieldType[] {
    return [
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
  }
}