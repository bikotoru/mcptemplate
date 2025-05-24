/**
 * Validador de queries SQL para prevenir operaciones peligrosas
 */

export interface SqlValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  queryType: string;
}

export class SqlValidator {
  // Comandos permitidos
  private static readonly ALLOWED_OPERATIONS = [
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'CREATE TABLE',
    'ALTER TABLE',
    'CREATE INDEX',
    'CREATE VIEW',
    'ALTER VIEW',
    'WITH' // Para CTEs
  ];

  // Comandos prohibidos (que pueden ser peligrosos)
  private static readonly FORBIDDEN_OPERATIONS = [
    'DROP DATABASE',
    'DROP TABLE',
    'DROP VIEW',
    'DROP INDEX',
    'DROP SCHEMA',
    'TRUNCATE',
    'EXEC',
    'EXECUTE',
    'SP_',
    'XP_',
    'BULK INSERT',
    'OPENROWSET',
    'OPENDATASOURCE',
    'SHUTDOWN',
    'RESTORE',
    'BACKUP',
    'DBCC',
    'ALTER DATABASE',
    'CREATE DATABASE',
    'USE ',
    'KILL'
  ];

  // Funciones del sistema que pueden ser peligrosas
  private static readonly FORBIDDEN_FUNCTIONS = [
    'OPENQUERY',
    'OPENROWSET',
    'OPENDATASOURCE',
    'CMDSHELL',
    'OLE DB'
  ];

  /**
   * Valida si una query SQL es segura para ejecutar
   */
  static validate(query: string): SqlValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Normalizar la query (remover comentarios y espacios extra)
    const normalizedQuery = this.normalizeQuery(query);
    
    if (!normalizedQuery.trim()) {
      return {
        isValid: false,
        errors: ['La query no puede estar vacía'],
        warnings: [],
        queryType: 'EMPTY'
      };
    }

    // Detectar el tipo de operación
    const queryType = this.detectQueryType(normalizedQuery);

    // Verificar operaciones prohibidas
    const forbiddenCheck = this.checkForbiddenOperations(normalizedQuery);
    if (forbiddenCheck.length > 0) {
      errors.push(...forbiddenCheck);
    }

    // Verificar funciones prohibidas
    const forbiddenFunctions = this.checkForbiddenFunctions(normalizedQuery);
    if (forbiddenFunctions.length > 0) {
      errors.push(...forbiddenFunctions);
    }

    // Verificar si es una operación permitida
    if (!this.isAllowedOperation(normalizedQuery)) {
      errors.push(`Operación no permitida. Solo se permiten: ${this.ALLOWED_OPERATIONS.join(', ')}`);
    }

    // Generar advertencias
    warnings.push(...this.generateWarnings(normalizedQuery, queryType));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      queryType
    };
  }

  /**
   * Normaliza la query removiendo comentarios y espacios extra
   */
  private static normalizeQuery(query: string): string {
    return query
      // Remover comentarios de línea
      .replace(/--.*$/gm, '')
      // Remover comentarios de bloque
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  /**
   * Detecta el tipo de operación de la query
   */
  private static detectQueryType(query: string): string {
    const firstWord = query.split(' ')[0];
    
    if (query.startsWith('WITH ')) return 'CTE_SELECT';
    if (firstWord === 'SELECT') return 'SELECT';
    if (firstWord === 'INSERT') return 'INSERT';
    if (firstWord === 'UPDATE') return 'UPDATE';
    if (firstWord === 'DELETE') return 'DELETE';
    if (query.startsWith('CREATE TABLE')) return 'CREATE_TABLE';
    if (query.startsWith('ALTER TABLE')) return 'ALTER_TABLE';
    if (query.startsWith('CREATE INDEX')) return 'CREATE_INDEX';
    if (query.startsWith('CREATE VIEW')) return 'CREATE_VIEW';
    if (query.startsWith('ALTER VIEW')) return 'ALTER_VIEW';
    
    return 'UNKNOWN';
  }

  /**
   * Verifica si hay operaciones prohibidas en la query
   */
  private static checkForbiddenOperations(query: string): string[] {
    const errors: string[] = [];
    
    for (const forbidden of this.FORBIDDEN_OPERATIONS) {
      if (query.includes(forbidden)) {
        errors.push(`Operación prohibida detectada: ${forbidden}`);
      }
    }
    
    return errors;
  }

  /**
   * Verifica si hay funciones prohibidas en la query
   */
  private static checkForbiddenFunctions(query: string): string[] {
    const errors: string[] = [];
    
    for (const func of this.FORBIDDEN_FUNCTIONS) {
      if (query.includes(func)) {
        errors.push(`Función prohibida detectada: ${func}`);
      }
    }
    
    return errors;
  }

  /**
   * Verifica si la operación está permitida
   */
  private static isAllowedOperation(query: string): boolean {
    return this.ALLOWED_OPERATIONS.some(op => {
      if (op.includes(' ')) {
        return query.startsWith(op);
      } else {
        return query.startsWith(op + ' ') || query === op;
      }
    });
  }

  /**
   * Genera advertencias basadas en el contenido de la query
   */
  private static generateWarnings(query: string, queryType: string): string[] {
    const warnings: string[] = [];

    // Advertir sobre DELETE sin WHERE
    if (queryType === 'DELETE' && !query.includes('WHERE')) {
      warnings.push('DELETE sin cláusula WHERE puede eliminar todos los registros de la tabla');
    }

    // Advertir sobre UPDATE sin WHERE
    if (queryType === 'UPDATE' && !query.includes('WHERE')) {
      warnings.push('UPDATE sin cláusula WHERE puede modificar todos los registros de la tabla');
    }

    // Advertir sobre queries muy largas
    if (query.length > 5000) {
      warnings.push('Query muy larga, considera dividirla en operaciones más pequeñas');
    }

    // Advertir sobre múltiples declaraciones
    if (query.split(';').length > 2) { // Más de una declaración (considerando el ; final)
      warnings.push('Query contiene múltiples declaraciones, solo se ejecutará la primera');
    }

    return warnings;
  }

  /**
   * Sanitiza una query removiendo múltiples declaraciones
   */
  static sanitizeQuery(query: string): string {
    // Solo tomar la primera declaración SQL
    const statements = query.split(';');
    return statements[0].trim();
  }

  /**
   * Verifica si una query es de solo lectura
   */
  static isReadOnlyQuery(query: string): boolean {
    const normalizedQuery = this.normalizeQuery(query);
    const queryType = this.detectQueryType(normalizedQuery);
    return queryType === 'SELECT' || queryType === 'CTE_SELECT';
  }
}