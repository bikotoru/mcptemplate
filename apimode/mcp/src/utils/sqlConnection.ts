/**
 * Utilidades para manejo de conexiones SQL Server
 */

import sql from 'mssql';

export interface ConnectionInfo {
  server: string;
  database?: string;
  user?: string;
  password?: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
  options?: {
    enableArithAbort?: boolean;
  };
}

export class SqlConnection {
  private static pool: sql.ConnectionPool | null = null;
  private static connectionString: string | null = null;

  /**
   * Parsea una cadena de conexión SQL Server
   */
  static parseConnectionString(connectionString: string): ConnectionInfo {
    const config: ConnectionInfo = {
      server: '',
      encrypt: true,
      trustServerCertificate: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
      options: {
        enableArithAbort: true
      }
    };

    // Detectar si es formato de URL o formato de pares clave=valor
    if (connectionString.startsWith('mssql://') || connectionString.startsWith('sqlserver://')) {
      // Formato URL
      const url = new URL(connectionString);
      config.server = url.hostname + (url.port ? `:${url.port}` : '');
      config.database = url.pathname.substring(1);
      config.user = url.username;
      config.password = url.password;

      // Parsear parámetros de query
      url.searchParams.forEach((value, key) => {
        switch (key.toLowerCase()) {
          case 'encrypt':
            config.encrypt = value.toLowerCase() === 'true';
            break;
          case 'trustservercertificate':
            config.trustServerCertificate = value.toLowerCase() === 'true';
            break;
          case 'connectiontimeout':
            config.connectionTimeout = parseInt(value) * 1000;
            break;
          case 'requesttimeout':
            config.requestTimeout = parseInt(value) * 1000;
            break;
        }
      });
    } else {
      // Formato de pares clave=valor
      const pairs = connectionString.split(';').filter(pair => pair.trim());
      
      for (const pair of pairs) {
        const [key, value] = pair.split('=').map(s => s.trim());
        if (!key || !value) continue;

        switch (key.toLowerCase()) {
          case 'server':
          case 'data source':
            config.server = value;
            break;
          case 'database':
          case 'initial catalog':
            config.database = value;
            break;
          case 'user id':
          case 'uid':
            config.user = value;
            break;
          case 'password':
          case 'pwd':
            config.password = value;
            break;
          case 'encrypt':
            config.encrypt = value.toLowerCase() === 'true';
            break;
          case 'trustservercertificate':
            config.trustServerCertificate = value.toLowerCase() === 'true';
            break;
          case 'connection timeout':
            config.connectionTimeout = parseInt(value) * 1000;
            break;
          case 'request timeout':
            config.requestTimeout = parseInt(value) * 1000;
            break;
        }
      }
    }

    // Validar configuración mínima
    if (!config.server) {
      throw new Error('Server es requerido en la cadena de conexión');
    }

    return config;
  }

  /**
   * Establece la conexión con la base de datos
   */
  static async connect(connectionString: string): Promise<void> {
    try {
      // Cerrar conexión existente si la hay
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
      }

      const config = this.parseConnectionString(connectionString);
      this.pool = new sql.ConnectionPool(config);
      this.connectionString = connectionString;

      await this.pool.connect();
      
      // Configurar opciones de seguridad adicionales
      await this.pool.request().query("SET ARITHABORT ON");
      
    } catch (error: any) {
      this.pool = null;
      this.connectionString = null;
      throw new Error(`Error conectando a la base de datos: ${error.message}`);
    }
  }

  /**
   * Obtiene la instancia del pool de conexiones
   */
  static getPool(): sql.ConnectionPool {
    if (!this.pool) {
      throw new Error('No hay conexión activa. Llama primero a connect()');
    }
    return this.pool;
  }

  /**
   * Verifica si hay una conexión activa
   */
  static isConnected(): boolean {
    return this.pool !== null && this.pool.connected;
  }

  /**
   * Cierra la conexión
   */
  static async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
      } catch (error) {
        // Ignorar errores al cerrar
      } finally {
        this.pool = null;
        this.connectionString = null;
      }
    }
  }

  /**
   * Obtiene información de la base de datos actual
   */
  static async getDatabaseInfo(): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('No hay conexión activa');
    }

    const request = this.pool!.request();
    const result = await request.query(`
      SELECT 
        DB_NAME() as DatabaseName,
        @@VERSION as ServerVersion,
        SYSTEM_USER as CurrentUser,
        GETDATE() as CurrentTime,
        @@SERVERNAME as ServerName
    `);

    return result.recordset[0];
  }

  /**
   * Lista las tablas disponibles en la base de datos
   */
  static async getTables(): Promise<string[]> {
    if (!this.isConnected()) {
      throw new Error('No hay conexión activa');
    }

    const request = this.pool!.request();
    const result = await request.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    return result.recordset.map(row => row.TABLE_NAME);
  }

  /**
   * Obtiene la estructura de una tabla
   */
  static async getTableStructure(tableName: string): Promise<any[]> {
    if (!this.isConnected()) {
      throw new Error('No hay conexión activa');
    }

    // Sanitizar nombre de tabla
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');

    const request = this.pool!.request();
    const result = await request.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${sanitizedTableName}'
      ORDER BY ORDINAL_POSITION
    `);

    return result.recordset;
  }
}