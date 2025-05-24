import { SqlConnection } from '../utils/sqlConnection.js';
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
        return ResponseFormatter.formatError("connectionString y action son requeridos");
      }

      const { connectionString, action, tableName } = args as DatabaseInfoArgs;

      // Conectar a la base de datos
      await SqlConnection.connect(connectionString);

      let responseText = '';

      try {
        switch (action) {
          case 'info':
            responseText = await this.getDatabaseInfo();
            break;
          case 'tables':
            responseText = await this.getTablesInfo();
            break;
          case 'table_structure':
            if (!tableName) {
              return ResponseFormatter.formatError("tableName es requerido para action='table_structure'");
            }
            responseText = await this.getTableStructureInfo(tableName);
            break;
          default:
            return ResponseFormatter.formatError(`Acción no válida: ${action}`);
        }

      } finally {
        // Cerrar la conexión
        await SqlConnection.disconnect();
      }

      return {
        content: [
          {
            type: "text" as const,
            text: responseText,
          },
        ],
      };

    } catch (error: any) {
      // Asegurar que la conexión se cierre en caso de error
      try {
        await SqlConnection.disconnect();
      } catch (disconnectError) {
        // Ignorar errores al desconectar
      }

      return ResponseFormatter.formatError(`Error obteniendo información de la base de datos: ${error.message}`);
    }
  }

  private static async getDatabaseInfo(): Promise<string> {
    const info = await SqlConnection.getDatabaseInfo();
    
    let responseText = `# 📊 Información de la Base de Datos\n\n`;
    responseText += `## Detalles de Conexión\n\n`;
    responseText += `- **Base de Datos:** ${info.DatabaseName}\n`;
    responseText += `- **Servidor:** ${info.ServerName}\n`;
    responseText += `- **Usuario Actual:** ${info.CurrentUser}\n`;
    responseText += `- **Fecha/Hora Actual:** ${new Date(info.CurrentTime).toLocaleString()}\n\n`;
    responseText += `## Versión del Servidor\n\n`;
    responseText += `\`\`\`\n${info.ServerVersion}\n\`\`\`\n\n`;
    responseText += `## Acciones Disponibles\n\n`;
    responseText += `- Usa \`action: "tables"\` para listar todas las tablas\n`;
    responseText += `- Usa \`action: "table_structure"\` con \`tableName\` para ver la estructura de una tabla específica\n`;
    responseText += `- Usa la herramienta \`execute_sql\` para ejecutar queries personalizadas\n`;

    return responseText;
  }

  private static async getTablesInfo(): Promise<string> {
    const tables = await SqlConnection.getTables();
    
    let responseText = `# 📋 Tablas en la Base de Datos\n\n`;
    
    if (tables.length === 0) {
      responseText += `> No se encontraron tablas en esta base de datos.\n`;
      return responseText;
    }

    responseText += `**Total de Tablas:** ${tables.length}\n\n`;
    responseText += `## Lista de Tablas\n\n`;
    
    tables.forEach((table, index) => {
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

  private static async getTableStructureInfo(tableName: string): Promise<string> {
    const structure = await SqlConnection.getTableStructure(tableName);
    
    let responseText = `# 🏗️ Estructura de la Tabla: ${tableName}\n\n`;
    
    if (structure.length === 0) {
      responseText += `> ⚠️ No se encontró la tabla '${tableName}' o no tiene columnas.\n`;
      return responseText;
    }

    responseText += `**Total de Columnas:** ${structure.length}\n\n`;
    responseText += `## Definición de Columnas\n\n`;
    responseText += `| Columna | Tipo | Nulo | Por Defecto | Tamaño | Precisión | Escala |\n`;
    responseText += `|---------|------|------|-------------|---------|-----------|--------|\n`;

    structure.forEach(col => {
      const columnName = col.COLUMN_NAME;
      const dataType = col.DATA_TYPE;
      const isNullable = col.IS_NULLABLE === 'YES' ? '✅' : '❌';
      const defaultValue = col.COLUMN_DEFAULT || '-';
      const maxLength = col.CHARACTER_MAXIMUM_LENGTH || '-';
      const precision = col.NUMERIC_PRECISION || '-';
      const scale = col.NUMERIC_SCALE || '-';

      responseText += `| ${columnName} | ${dataType} | ${isNullable} | ${defaultValue} | ${maxLength} | ${precision} | ${scale} |\n`;
    });

    responseText += `\n## Ejemplo de Query SELECT\n\n`;
    responseText += `\`\`\`sql\n`;
    responseText += `SELECT TOP 10 *\n`;
    responseText += `FROM ${tableName};\n`;
    responseText += `\`\`\`\n\n`;

    responseText += `## Ejemplo de Query INSERT\n\n`;
    const nonIdentityColumns = structure.filter(col => 
      !col.COLUMN_DEFAULT?.includes('IDENTITY') && 
      col.COLUMN_NAME !== 'id' && 
      col.COLUMN_NAME !== 'Id'
    );

    if (nonIdentityColumns.length > 0) {
      responseText += `\`\`\`sql\n`;
      responseText += `INSERT INTO ${tableName} (\n`;
      responseText += `    ${nonIdentityColumns.map(col => col.COLUMN_NAME).join(',\n    ')}\n`;
      responseText += `) VALUES (\n`;
      responseText += `    ${nonIdentityColumns.map(col => this.getExampleValue(col)).join(',\n    ')}\n`;
      responseText += `);\n`;
      responseText += `\`\`\`\n`;
    }

    return responseText;
  }

  private static getExampleValue(column: any): string {
    const dataType = column.DATA_TYPE.toLowerCase();
    const isNullable = column.IS_NULLABLE === 'YES';

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