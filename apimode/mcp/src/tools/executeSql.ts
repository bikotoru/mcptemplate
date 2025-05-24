import sql from 'mssql';
import { SqlValidator } from '../utils/sqlValidator.js';
import { SqlConnection } from '../utils/sqlConnection.js';
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
        return ResponseFormatter.formatError("connectionString y query son requeridos");
      }

      const { connectionString, query, maxRows = 1000 } = args as SqlExecuteArgs;

      // Validar la query antes de ejecutar
      const validation = SqlValidator.validate(query);
      
      if (!validation.isValid) {
        return this.formatValidationError(validation);
      }

      // Sanitizar la query
      const sanitizedQuery = SqlValidator.sanitizeQuery(query);

      // Conectar a la base de datos
      await SqlConnection.connect(connectionString);

      let result: any;
      let responseText = '';

      try {
        const pool = SqlConnection.getPool();
        const request = pool.request();

        // Configurar timeout
        // Ejecutar la query
        const startTime = Date.now();
        result = await request.query(sanitizedQuery);
        const executionTime = Date.now() - startTime;

        // Formatear respuesta basada en el tipo de query
        responseText = this.formatSqlResult(result, validation.queryType, executionTime, maxRows);

        // Mostrar advertencias si las hay
        if (validation.warnings.length > 0) {
          responseText = `## ⚠️ Advertencias\n\n${validation.warnings.map(w => `- ${w}`).join('\n')}\n\n${responseText}`;
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

      return ResponseFormatter.formatError(`Error ejecutando SQL: ${error.message}`);
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

  private static formatSqlResult(result: any, queryType: string, executionTime: number, maxRows: number): string {
    let responseText = `# ✅ Query SQL Ejecutada Exitosamente\n\n`;
    responseText += `**Tipo de Operación:** ${queryType}\n`;
    responseText += `**Tiempo de Ejecución:** ${executionTime}ms\n\n`;

    switch (queryType) {
      case 'SELECT':
      case 'CTE_SELECT':
        return this.formatSelectResult(result, executionTime, maxRows);
      
      case 'INSERT':
        responseText += `## Resultado de INSERT\n\n`;
        responseText += `- **Filas Afectadas:** ${result.rowsAffected[0] || 0}\n`;
        if (result.recordset && result.recordset.length > 0) {
          responseText += `- **Registros Retornados:** ${result.recordset.length}\n\n`;
          responseText += this.formatResultSet(result.recordset, maxRows);
        }
        break;

      case 'UPDATE':
        responseText += `## Resultado de UPDATE\n\n`;
        responseText += `- **Filas Actualizadas:** ${result.rowsAffected[0] || 0}\n`;
        break;

      case 'DELETE':
        responseText += `## Resultado de DELETE\n\n`;
        responseText += `- **Filas Eliminadas:** ${result.rowsAffected[0] || 0}\n`;
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
        responseText += `## Vista ${queryType === 'CREATE_VIEW' ? 'Creada' : 'Alterada'} Exitosamente\n\n`;
        responseText += `La vista ha sido ${queryType === 'CREATE_VIEW' ? 'creada' : 'modificada'} correctamente.\n`;
        break;

      default:
        responseText += `## Operación Completada\n\n`;
        if (result.rowsAffected && result.rowsAffected.length > 0) {
          responseText += `- **Filas Afectadas:** ${result.rowsAffected[0]}\n`;
        }
    }

    return responseText;
  }

  private static formatSelectResult(result: any, executionTime: number, maxRows: number): string {
    let responseText = `# 📊 Resultados de SELECT\n\n`;
    responseText += `**Tiempo de Ejecución:** ${executionTime}ms\n`;
    
    if (!result.recordset || result.recordset.length === 0) {
      responseText += `**Filas Encontradas:** 0\n\n> No se encontraron registros que coincidan con la consulta.`;
      return responseText;
    }

    const totalRows = result.recordset.length;
    const displayRows = Math.min(totalRows, maxRows);
    
    responseText += `**Filas Encontradas:** ${totalRows}\n`;
    responseText += `**Filas Mostradas:** ${displayRows}\n\n`;

    if (totalRows > maxRows) {
      responseText += `> ⚠️ Se encontraron ${totalRows} filas, pero solo se muestran las primeras ${maxRows}. Usa el parámetro maxRows para ajustar este límite.\n\n`;
    }

    responseText += this.formatResultSet(result.recordset.slice(0, maxRows), maxRows);

    return responseText;
  }

  private static formatResultSet(recordset: any[], maxRows: number): string {
    if (!recordset || recordset.length === 0) {
      return '> No hay datos para mostrar.';
    }

    const columns = Object.keys(recordset[0]);
    let resultText = `## Datos\n\n`;

    // Crear tabla en formato Markdown
    resultText += `| ${columns.join(' | ')} |\n`;
    resultText += `| ${columns.map(() => '---').join(' | ')} |\n`;

    for (const row of recordset) {
      const values = columns.map(col => {
        let value = row[col];
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