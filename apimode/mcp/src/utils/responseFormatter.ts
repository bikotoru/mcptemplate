import { ToolResponse } from "../types";

export class ResponseFormatter {
  static formatGenerationResult(data: any): ToolResponse {
    let responseText = `# Resultado de Generación CRUD

## Estado: ${data.success ? '✅ Exitoso' : '❌ Error'}

**Mensaje:** ${data.message}

`;

    if (data.generated_files && data.generated_files.length > 0) {
      responseText += `## Archivos Generados (${data.generated_files.length})

${data.generated_files.map((file: string) => `- \`${file}\``).join('\n')}

`;
    }

    if (data.errors && data.errors.length > 0) {
      responseText += `## Errores

${data.errors.map((error: string) => `- ${error}`).join('\n')}

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
          type: "text" as const,
          text: responseText,
        },
      ],
    };
  }

  static formatValidationResult(data: any, config: any): ToolResponse {
    let responseText = `# Validación de Configuración CRUD

## Estado: ${data.valid ? '✅ Válida' : '❌ Inválida'}

`;

    if (!data.valid && data.errors) {
      responseText += `## Errores Encontrados

${data.errors.map((error: any) => `- **${error.field}:** ${error.message}`).join('\n')}

`;
    }

    if (data.warnings && data.warnings.length > 0) {
      responseText += `## Advertencias

${data.warnings.map((warning: string) => `- ${warning}`).join('\n')}

`;
    }

    if (data.valid) {
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
          type: "text" as const,
          text: responseText,
        },
      ],
    };
  }

  static formatError(message: string): ToolResponse {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }

  static formatFieldTypes(fieldTypes: any[]): ToolResponse {
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
          type: "text" as const,
          text: responseText,
        },
      ],
    };
  }

  static formatExampleConfig(entityName: string, complexity: string, example: any): ToolResponse {
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
          type: "text" as const,
          text: responseText,
        },
      ],
    };
  }
}