import { apiClient } from '../utils/apiClient.js';
import { ResponseFormatter } from '../utils/responseFormatter.js';
import { ToolResponse } from '../types/index.js';

export interface DatabaseInfoArgs {
  connectionString: string;
  action: 'info' | 'tables' | 'table_structure';
  tableName?: string;
}

export class GetDatabaseInfoTool {
  static getSchema() {
    return {
      name: "get_database_info",
      description: "Obtiene información sobre la base de datos SQL Server: información general, lista de tablas, o estructura de una tabla específica.",
      inputSchema: {
        type: "object",
        properties: {
          connectionString: {
            type: "string",
            description: "Cadena de conexión a SQL Server. Esta información debe estar en el archivo .env del proyecto."
          },
          action: {
            type: "string",
            enum: ["info", "tables", "table_structure"],
            description: "Acción a realizar: 'info' para información general, 'tables' para listar tablas, 'table_structure' para estructura de una tabla"
          },
          tableName: {
            type: "string",
            description: "Nombre de la tabla (requerido solo para action='table_structure')"
          }
        },
        required: ["connectionString", "action"]
      }
    };
  }

  static async execute(args: any): Promise<ToolResponse> {
    try {
      if (!args || !args.connectionString || !args.action) {
        return ResponseFormatter.formatError("DEBUG: getDatabaseInfo.execute - connectionString y action son requeridos");
      }

      const { connectionString, action, tableName } = args as DatabaseInfoArgs;

      // DEBUG: Mostrar qué parámetros recibió
      const debugInfo = `DEBUG: getDatabaseInfo.execute iniciado\nParametros: connectionString=${connectionString ? 'PRESENTE' : 'AUSENTE'}, action=${action}, tableName=${tableName}\n\n`;

      try {
        // Llamar a la API de Python
        const response = await apiClient.post('/database-info', {
          connection_string: connectionString,
          action: action,
          table_name: tableName
        });

      const result = response.data;

      if (!result.success) {
        return ResponseFormatter.formatError(`Error: ${result.message || 'Error desconocido'}`);
      }

      // Formatear respuesta según la acción
      let responseText = '';

      switch (action) {
        case 'info':
          responseText = this.formatDatabaseInfo(result.data);
          break;
        case 'tables':
          responseText = this.formatTablesInfo(result.data);
          break;
        case 'table_structure':
          responseText = this.formatTableStructureInfo(result.data);
          break;
        default:
          return ResponseFormatter.formatError(`Acción no válida: ${action}`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: debugInfo + responseText,
          },
        ],
      };

      } catch (apiError: any) {
        const errorMessage = apiError?.response?.data?.detail || apiError?.message || 'Error desconocido llamando API';
        return ResponseFormatter.formatError(`DEBUG: Error en API call\n${debugInfo}Error: ${errorMessage}`);
      }

    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Error desconocido obteniendo información';
      return ResponseFormatter.formatError(`DEBUG: Error general en getDatabaseInfo.execute\nError: ${errorMessage}`);
    }
  }

  private static formatDatabaseInfo(info: any): string {
    let responseText = `# 📊 Información de la Base de Datos\n\n`;
    responseText += `## Detalles de Conexión\n\n`;
    responseText += `- **Base de Datos:** ${info.database_name}\n`;
    responseText += `- **Servidor:** ${info.server_name}\n`;
    responseText += `- **Usuario Actual:** ${info.current_user}\n`;
    responseText += `- **Fecha/Hora Actual:** ${info.current_time ? new Date(info.current_time).toLocaleString() : 'N/A'}\n\n`;
    responseText += `## Versión del Servidor\n\n`;
    responseText += `\`\`\`\n${info.server_version}\n\`\`\`\n\n`;
    responseText += `## Acciones Disponibles\n\n`;
    responseText += `- Usa \`action: "tables"\` para listar todas las tablas\n`;
    responseText += `- Usa \`action: "table_structure"\` con \`tableName\` para ver la estructura de una tabla específica\n`;
    responseText += `- Usa la herramienta \`execute_sql\` para ejecutar queries personalizadas\n`;

    return responseText;
  }

  private static formatTablesInfo(data: any): string {
    const tables = data.tables || [];
    
    let responseText = `# 📋 Tablas en la Base de Datos\n\n`;
    
    if (tables.length === 0) {
      responseText += `> No se encontraron tablas en esta base de datos.\n`;
      return responseText;
    }

    responseText += `**Total de Tablas:** ${data.count || tables.length}\n\n`;
    responseText += `## Lista de Tablas\n\n`;
    
    tables.forEach((table: string, index: number) => {
      responseText += `${index + 1}. **${table}**\n`;
    });

    responseText += `\n## Siguiente Paso\n\n`;
    responseText += `Para ver la estructura de una tabla específica, usa:\n`;
    responseText += `\`\`\`json\n`;
    responseText += `{\n`;
    responseText += `  "connectionString": "tu_string_de_conexión",\n`;
    responseText += `  "action": "table_structure",\n`;
    responseText += `  "tableName": "nombre_de_la_tabla"\n`;
    responseText += `}\n`;
    responseText += `\`\`\`\n`;

    return responseText;
  }

  private static formatTableStructureInfo(data: any): string {
    const tableName = data.table_name;
    const structure = data.columns || [];
    
    let responseText = `# 🏗️ Estructura de la Tabla: ${tableName}\n\n`;
    
    if (structure.length === 0) {
      responseText += `> ⚠️ No se encontró la tabla '${tableName}' o no tiene columnas.\n`;
      return responseText;
    }

    responseText += `**Total de Columnas:** ${data.column_count || structure.length}\n\n`;
    responseText += `## Definición de Columnas\n\n`;
    responseText += `| Columna | Tipo | Nulo | Por Defecto | Tamaño | Precisión | Escala |\n`;
    responseText += `|---------|------|------|-------------|---------|-----------|--------|\n`;

    structure.forEach((col: any) => {
      const columnName = col.column_name;
      const dataType = col.data_type;
      const isNullable = col.is_nullable === 'YES' ? '✅' : '❌';
      const defaultValue = col.column_default || '-';
      const maxLength = col.max_length || '-';
      const precision = col.precision || '-';
      const scale = col.scale || '-';

      responseText += `| ${columnName} | ${dataType} | ${isNullable} | ${defaultValue} | ${maxLength} | ${precision} | ${scale} |\n`;
    });

    responseText += `\n## Ejemplo de Query SELECT\n\n`;
    responseText += `\`\`\`sql\n`;
    responseText += `SELECT TOP 10 *\n`;
    responseText += `FROM ${tableName};\n`;
    responseText += `\`\`\`\n\n`;

    responseText += `## Ejemplo de Query INSERT\n\n`;
    const nonIdentityColumns = structure.filter((col: any) => 
      !col.column_default?.includes('IDENTITY') && 
      col.column_name !== 'id' && 
      col.column_name !== 'Id'
    );

    if (nonIdentityColumns.length > 0) {
      responseText += `\`\`\`sql\n`;
      responseText += `INSERT INTO ${tableName} (\n`;
      responseText += `    ${nonIdentityColumns.map((col: any) => col.column_name).join(',\n    ')}\n`;
      responseText += `) VALUES (\n`;
      responseText += `    ${nonIdentityColumns.map((col: any) => this.getExampleValue(col)).join(',\n    ')}\n`;
      responseText += `);\n`;
      responseText += `\`\`\`\n`;
    }

    return responseText;
  }

  private static getExampleValue(column: any): string {
    const dataType = column.data_type.toLowerCase();
    const isNullable = column.is_nullable === 'YES';

    if (isNullable) {
      return 'NULL  -- O un valor apropiado';
    }

    switch (dataType) {
      case 'varchar':
      case 'nvarchar':
      case 'char':
      case 'nchar':
      case 'text':
      case 'ntext':
        return `'Ejemplo texto'`;
      case 'int':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return '123';
      case 'decimal':
      case 'numeric':
      case 'money':
      case 'float':
      case 'real':
        return '123.45';
      case 'bit':
        return '1';
      case 'datetime':
      case 'datetime2':
      case 'smalldatetime':
        return `'${new Date().toISOString().split('T')[0]}'`;
      case 'date':
        return `'${new Date().toISOString().split('T')[0]}'`;
      case 'time':
        return "'12:00:00'";
      case 'uniqueidentifier':
        return 'NEWID()';
      default:
        return "'valor_ejemplo'";
    }
  }
}