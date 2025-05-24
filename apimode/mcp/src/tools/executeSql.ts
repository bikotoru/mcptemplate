import { apiClient } from '../utils/apiClient.js';
import { ResponseFormatter } from '../utils/responseFormatter.js';
import { ToolResponse } from '../types/index.js';

export interface SqlExecuteArgs {
  connectionString: string;
  query: string;
  maxRows?: number;
}

export class ExecuteSqlTool {
  static getSchema() {
    return {
      name: "execute_sql",
      description: "Ejecuta queries SQL Server con restricciones de seguridad. Solo permite SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, CREATE INDEX. NO permite DROP DATABASE, DROP TABLE, TRUNCATE ni operaciones peligrosas.",
      inputSchema: {
        type: "object",
        properties: {
          connectionString: {
            type: "string",
            description: "Cadena de conexión a SQL Server. Ejemplo: 'Server=localhost;Database=midb;User Id=usuario;Password=password;Encrypt=true;TrustServerCertificate=true;' o formato URL. IMPORTANTE: Esta información debe estar en el archivo .env del proyecto que usa este MCP."
          },
          query: {
            type: "string",
            description: "Query SQL a ejecutar. Solo se permiten operaciones seguras: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, CREATE INDEX, CREATE VIEW. Se prohíben: DROP DATABASE, DROP TABLE, TRUNCATE, EXEC, SP_, XP_, etc."
          },
          maxRows: {
            type: "number",
            description: "Máximo número de filas a retornar para queries SELECT (por defecto 1000)",
            default: 1000
          }
        },
        required: ["connectionString", "query"]
      }
    };
  }

  static async execute(args: any): Promise<ToolResponse> {
    try {
      if (!args || !args.connectionString || !args.query) {
        return ResponseFormatter.formatError("DEBUG: ExecuteSqlTool.execute - connectionString y query son requeridos");
      }

      const { connectionString, query, maxRows = 1000 } = args as SqlExecuteArgs;

      // DEBUG: Mostrar qué parámetros recibió
      const debugInfo = `DEBUG: ExecuteSqlTool.execute iniciado\nParametros: connectionString=${connectionString ? 'PRESENTE' : 'AUSENTE'}, query=${query ? query.substring(0, 50) + '...' : 'AUSENTE'}, maxRows=${maxRows}\n\n`;

      try {
        // Llamar a la API de Python
        const response = await apiClient.post('/execute-sql', {
          connection_string: connectionString,
          query: query,
          max_rows: maxRows
        });

      const result = response.data;

      if (!result.success) {
        if (result.errors) {
          return this.formatValidationError(result);
        }
        return ResponseFormatter.formatError(`Error ejecutando SQL: ${result.errors?.[0] || 'Error desconocido'}`);
      }

      // Formatear respuesta exitosa
      let responseText = this.formatSqlResult(result);

      // Mostrar advertencias si las hay
      if (result.warnings && result.warnings.length > 0) {
        responseText = `## ⚠️ Advertencias\n\n${result.warnings.map((w: string) => `- ${w}`).join('\n')}\n\n${responseText}`;
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
      const errorMessage = error?.response?.data?.detail || error?.message || 'Error desconocido ejecutando SQL';
      return ResponseFormatter.formatError(`DEBUG: Error general en ExecuteSqlTool.execute\nError: ${errorMessage}`);
    }
  }

  private static formatValidationError(validation: any): ToolResponse {
    let errorText = `# ❌ Query SQL No Válida\n\n## Errores Encontrados\n\n${validation.errors.map((error: string) => `- ${error}`).join('\n')}\n\n`;

    errorText += `## Operaciones Permitidas\n\n- **SELECT**: Consultar datos\n- **INSERT**: Insertar nuevos registros\n- **UPDATE**: Actualizar registros existentes (se recomienda usar WHERE)\n- **DELETE**: Eliminar registros (se recomienda usar WHERE)\n- **CREATE TABLE**: Crear nuevas tablas\n- **ALTER TABLE**: Modificar estructura de tablas\n- **CREATE INDEX**: Crear índices\n- **CREATE VIEW**: Crear vistas\n- **ALTER VIEW**: Modificar vistas\n\n## Operaciones Prohibidas\n\n- **DROP DATABASE/TABLE**: Eliminar bases de datos o tablas\n- **TRUNCATE**: Vaciar tablas\n- **EXEC/EXECUTE**: Ejecutar procedimientos\n- **SP_/XP_**: Procedimientos del sistema\n- **BULK INSERT**: Importación masiva\n- **SHUTDOWN/RESTORE/BACKUP**: Operaciones del servidor\n\n## Recomendaciones de Seguridad\n\n1. Siempre usa cláusulas WHERE en UPDATE y DELETE\n2. Evita queries muy largas o complejas\n3. El string de conexión debe estar en tu archivo **.env** del proyecto\n4. Usa parámetros en lugar de concatenar valores directamente`;

    return {
      content: [
        {
          type: "text" as const,
          text: errorText,
        },
      ],
      isError: true,
    };
  }

  private static formatSqlResult(result: any): string {
    let responseText = `# ✅ Query SQL Ejecutada Exitosamente\n\n`;
    responseText += `**Tipo de Operación:** ${result.query_type}\n`;
    responseText += `**Tiempo de Ejecución:** ${result.execution_time_ms}ms\n\n`;

    switch (result.query_type) {
      case 'SELECT':
      case 'CTE_SELECT':
        return this.formatSelectResult(result);
      
      case 'INSERT':
        responseText += `## Resultado de INSERT\n\n`;
        responseText += `- **Filas Afectadas:** ${result.rows_affected || 0}\n`;
        if (result.data && result.data.length > 0) {
          responseText += `- **Registros Retornados:** ${result.data.length}\n\n`;
          responseText += this.formatResultSet(result.data, result.columns);
        }
        break;

      case 'UPDATE':
        responseText += `## Resultado de UPDATE\n\n`;
        responseText += `- **Filas Actualizadas:** ${result.rows_affected || 0}\n`;
        break;

      case 'DELETE':
        responseText += `## Resultado de DELETE\n\n`;
        responseText += `- **Filas Eliminadas:** ${result.rows_affected || 0}\n`;
        break;

      case 'CREATE_TABLE':
        responseText += `## Tabla Creada Exitosamente\n\n`;
        responseText += `La tabla ha sido creada correctamente en la base de datos.\n`;
        break;

      case 'ALTER_TABLE':
        responseText += `## Tabla Alterada Exitosamente\n\n`;
        responseText += `La estructura de la tabla ha sido modificada correctamente.\n`;
        break;

      case 'CREATE_INDEX':
        responseText += `## Índice Creado Exitosamente\n\n`;
        responseText += `El índice ha sido creado correctamente.\n`;
        break;

      case 'CREATE_VIEW':
      case 'ALTER_VIEW':
        responseText += `## Vista ${result.query_type === 'CREATE_VIEW' ? 'Creada' : 'Alterada'} Exitosamente\n\n`;
        responseText += `La vista ha sido ${result.query_type === 'CREATE_VIEW' ? 'creada' : 'modificada'} correctamente.\n`;
        break;

      default:
        responseText += `## Operación Completada\n\n`;
        if (result.rows_affected) {
          responseText += `- **Filas Afectadas:** ${result.rows_affected}\n`;
        }
    }

    return responseText;
  }

  private static formatSelectResult(result: any): string {
    let responseText = `# 📊 Resultados de SELECT\n\n`;
    responseText += `**Tiempo de Ejecución:** ${result.execution_time_ms}ms\n`;
    
    if (!result.data || result.data.length === 0) {
      responseText += `**Filas Encontradas:** 0\n\n> No se encontraron registros que coincidan con la consulta.`;
      return responseText;
    }

    const totalRows = result.data.length;
    
    responseText += `**Filas Encontradas:** ${totalRows}\n`;
    responseText += `**Filas Mostradas:** ${totalRows}\n\n`;

    responseText += this.formatResultSet(result.data, result.columns);

    return responseText;
  }

  private static formatResultSet(data: any[][], columns: string[]): string {
    if (!data || data.length === 0) {
      return '> No hay datos para mostrar.';
    }

    if (!columns || columns.length === 0) {
      return '> No hay columnas definidas.';
    }

    let resultText = `## Datos\n\n`;

    // Crear tabla en formato Markdown
    resultText += `| ${columns.join(' | ')} |\n`;
    resultText += `| ${columns.map(() => '---').join(' | ')} |\n`;

    for (const row of data) {
      const values = row.map(value => {
        if (value === null || value === undefined) {
          return 'NULL';
        }
        if (typeof value === 'string' && value.length > 50) {
          return value.substring(0, 47) + '...';
        }
        if (value instanceof Date) {
          return value.toISOString().split('T')[0]; // Solo fecha
        }
        return String(value);
      });
      resultText += `| ${values.join(' | ')} |\n`;
    }

    return resultText;
  }
}