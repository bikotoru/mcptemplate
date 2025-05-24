"""
Utilidades para manejo de SQL Server
"""

import pyodbc
import re
from typing import Dict, List, Any, Optional, Tuple
from urllib.parse import urlparse, parse_qs
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SqlValidator:
    """Validador de queries SQL para prevenir operaciones peligrosas"""
    
    # Comandos permitidos
    ALLOWED_OPERATIONS = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE',
        'CREATE TABLE', 'ALTER TABLE', 'CREATE INDEX',
        'CREATE VIEW', 'ALTER VIEW', 'WITH'
    ]
    
    # Comandos prohibidos
    FORBIDDEN_OPERATIONS = [
        'DROP DATABASE', 'DROP TABLE', 'DROP VIEW', 'DROP INDEX', 'DROP SCHEMA',
        'TRUNCATE', 'EXEC', 'EXECUTE', 'SP_', 'XP_', 'BULK INSERT',
        'OPENROWSET', 'OPENDATASOURCE', 'SHUTDOWN', 'RESTORE', 'BACKUP',
        'DBCC', 'ALTER DATABASE', 'CREATE DATABASE', 'USE ', 'KILL'
    ]
    
    # Funciones peligrosas
    FORBIDDEN_FUNCTIONS = [
        'OPENQUERY', 'OPENROWSET', 'OPENDATASOURCE', 'CMDSHELL', 'OLE DB'
    ]
    
    @classmethod
    def validate(cls, query: str) -> Dict[str, Any]:
        """Valida si una query SQL es segura"""
        logger.info(f"Validando query: {query[:100]}...")
        
        normalized_query = cls._normalize_query(query)
        
        if not normalized_query.strip():
            return {
                'is_valid': False,
                'errors': ['La query no puede estar vacía'],
                'warnings': [],
                'query_type': 'EMPTY'
            }
        
        query_type = cls._detect_query_type(normalized_query)
        errors = []
        warnings = []
        
        # Verificar operaciones prohibidas
        forbidden_ops = cls._check_forbidden_operations(normalized_query)
        if forbidden_ops:
            errors.extend(forbidden_ops)
        
        # Verificar funciones prohibidas
        forbidden_funcs = cls._check_forbidden_functions(normalized_query)
        if forbidden_funcs:
            errors.extend(forbidden_funcs)
        
        # Verificar si es operación permitida
        if not cls._is_allowed_operation(normalized_query):
            errors.append(f"Operación no permitida. Solo se permiten: {', '.join(cls.ALLOWED_OPERATIONS)}")
        
        # Generar advertencias
        warnings.extend(cls._generate_warnings(normalized_query, query_type))
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'query_type': query_type
        }
    
    @classmethod
    def _normalize_query(cls, query: str) -> str:
        """Normaliza la query removiendo comentarios y espacios extra"""
        # Remover comentarios de línea
        query = re.sub(r'--.*$', '', query, flags=re.MULTILINE)
        # Remover comentarios de bloque
        query = re.sub(r'/\*[\s\S]*?\*/', '', query)
        # Normalizar espacios
        query = re.sub(r'\s+', ' ', query).strip().upper()
        return query
    
    @classmethod
    def _detect_query_type(cls, query: str) -> str:
        """Detecta el tipo de operación"""
        first_word = query.split(' ')[0] if query else ''
        
        if query.startswith('WITH '):
            return 'CTE_SELECT'
        elif first_word == 'SELECT':
            return 'SELECT'
        elif first_word == 'INSERT':
            return 'INSERT'
        elif first_word == 'UPDATE':
            return 'UPDATE'
        elif first_word == 'DELETE':
            return 'DELETE'
        elif query.startswith('CREATE TABLE'):
            return 'CREATE_TABLE'
        elif query.startswith('ALTER TABLE'):
            return 'ALTER_TABLE'
        elif query.startswith('CREATE INDEX'):
            return 'CREATE_INDEX'
        elif query.startswith('CREATE VIEW'):
            return 'CREATE_VIEW'
        elif query.startswith('ALTER VIEW'):
            return 'ALTER_VIEW'
        
        return 'UNKNOWN'
    
    @classmethod
    def _check_forbidden_operations(cls, query: str) -> List[str]:
        """Verifica operaciones prohibidas"""
        errors = []
        for forbidden in cls.FORBIDDEN_OPERATIONS:
            if forbidden in query:
                errors.append(f"Operación prohibida detectada: {forbidden}")
        return errors
    
    @classmethod
    def _check_forbidden_functions(cls, query: str) -> List[str]:
        """Verifica funciones prohibidas"""
        errors = []
        for func in cls.FORBIDDEN_FUNCTIONS:
            if func in query:
                errors.append(f"Función prohibida detectada: {func}")
        return errors
    
    @classmethod
    def _is_allowed_operation(cls, query: str) -> bool:
        """Verifica si la operación está permitida"""
        return any(
            query.startswith(op + ' ') or query == op or query.startswith(op)
            for op in cls.ALLOWED_OPERATIONS
        )
    
    @classmethod
    def _generate_warnings(cls, query: str, query_type: str) -> List[str]:
        """Genera advertencias"""
        warnings = []
        
        if query_type == 'DELETE' and 'WHERE' not in query:
            warnings.append('DELETE sin cláusula WHERE puede eliminar todos los registros')
        
        if query_type == 'UPDATE' and 'WHERE' not in query:
            warnings.append('UPDATE sin cláusula WHERE puede modificar todos los registros')
        
        if len(query) > 5000:
            warnings.append('Query muy larga, considera dividirla')
        
        if query.count(';') > 1:
            warnings.append('Query contiene múltiples declaraciones, solo se ejecutará la primera')
        
        return warnings
    
    @classmethod
    def sanitize_query(cls, query: str) -> str:
        """Sanitiza una query removiendo múltiples declaraciones"""
        statements = query.split(';')
        return statements[0].strip()


class SqlConnection:
    """Manejo de conexiones SQL Server"""
    
    @classmethod
    def parse_connection_string(cls, connection_string: str) -> Dict[str, Any]:
        """Parsea una cadena de conexión SQL Server"""
        logger.info("Parseando cadena de conexión")
        
        config = {
            'driver': '{ODBC Driver 17 for SQL Server}',
            'server': '',
            'database': '',
            'uid': '',
            'pwd': '',
            'encrypt': 'yes',
            'trustServerCertificate': 'yes',
            'timeout': 30
        }
        
        # Formato de pares clave=valor
        pairs = connection_string.split(';')
        for pair in pairs:
            if '=' in pair:
                key, value = pair.split('=', 1)
                key = key.strip().lower()
                value = value.strip()
                
                if key in ['server', 'data source']:
                    config['server'] = value
                elif key in ['database', 'initial catalog']:
                    config['database'] = value
                elif key in ['user id', 'uid']:
                    config['uid'] = value
                elif key in ['password', 'pwd']:
                    config['pwd'] = value
                elif key == 'encrypt':
                    config['encrypt'] = 'yes' if value.lower() == 'true' else 'no'
                elif key == 'trustservercertificate':
                    config['trustServerCertificate'] = 'yes' if value.lower() == 'true' else 'no'
        
        if not config['server']:
            raise ValueError("Server es requerido en la cadena de conexión")
        
        return config
    
    @classmethod
    def build_odbc_string(cls, config: Dict[str, Any]) -> str:
        """Construye la cadena ODBC"""
        parts = []
        for key, value in config.items():
            if key == 'timeout':
                continue
            if key == 'trustServerCertificate':
                parts.append(f"TrustServerCertificate={value}")
            else:
                parts.append(f"{key}={value}")
        
        odbc_string = ';'.join(parts)
        logger.info(f"Cadena ODBC construida: {odbc_string.replace(config.get('pwd', ''), '***')}")
        return odbc_string
    
    @classmethod
    def execute_query(cls, connection_string: str, query: str, max_rows: int = 1000) -> Dict[str, Any]:
        """Ejecuta una query SQL"""
        logger.info(f"Ejecutando query tipo: {SqlValidator._detect_query_type(SqlValidator._normalize_query(query))}")
        
        try:
            config = cls.parse_connection_string(connection_string)
            odbc_string = cls.build_odbc_string(config)
            
            # Conectar
            logger.info("Estableciendo conexión a SQL Server")
            conn = pyodbc.connect(odbc_string, timeout=config['timeout'])
            cursor = conn.cursor()
            
            # Configurar opciones de seguridad
            cursor.execute("SET ARITHABORT ON")
            
            # Ejecutar query
            logger.info("Ejecutando query")
            cursor.execute(query)
            
            result = {
                'success': True,
                'rows_affected': cursor.rowcount,
                'data': [],
                'columns': []
            }
            
            # Si hay resultados (SELECT)
            if cursor.description:
                # Obtener nombres de columnas
                result['columns'] = [column[0] for column in cursor.description]
                
                # Obtener datos (limitados)
                rows = cursor.fetchmany(max_rows)
                result['data'] = [list(row) for row in rows]
                
                logger.info(f"Query ejecutada exitosamente. Filas obtenidas: {len(result['data'])}")
            else:
                logger.info(f"Query ejecutada exitosamente. Filas afectadas: {result['rows_affected']}")
            
            # Cerrar conexión
            cursor.close()
            conn.close()
            
            return result
            
        except Exception as e:
            logger.error(f"Error ejecutando query: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'data': [],
                'columns': []
            }
    
    @classmethod
    def get_database_info(cls, connection_string: str) -> Dict[str, Any]:
        """Obtiene información de la base de datos"""
        logger.info("Obteniendo información de la base de datos")
        
        try:
            config = cls.parse_connection_string(connection_string)
            odbc_string = cls.build_odbc_string(config)
            
            conn = pyodbc.connect(odbc_string, timeout=config['timeout'])
            cursor = conn.cursor()
            
            # Información básica
            cursor.execute("""
                SELECT 
                    DB_NAME() as DatabaseName,
                    @@VERSION as ServerVersion,
                    SYSTEM_USER as CurrentUser,
                    GETDATE() as CurrentTime,
                    @@SERVERNAME as ServerName
            """)
            
            info = cursor.fetchone()
            
            result = {
                'database_name': info[0],
                'server_version': info[1],
                'current_user': info[2],
                'current_time': info[3].isoformat() if info[3] else None,
                'server_name': info[4]
            }
            
            cursor.close()
            conn.close()
            
            logger.info(f"Información obtenida para BD: {result['database_name']}")
            return result
            
        except Exception as e:
            logger.error(f"Error obteniendo información de BD: {str(e)}")
            raise e
    
    @classmethod
    def get_tables(cls, connection_string: str) -> List[str]:
        """Lista las tablas de la base de datos"""
        logger.info("Obteniendo lista de tablas")
        
        try:
            config = cls.parse_connection_string(connection_string)
            odbc_string = cls.build_odbc_string(config)
            
            conn = pyodbc.connect(odbc_string, timeout=config['timeout'])
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            """)
            
            tables = [row[0] for row in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            logger.info(f"Tablas encontradas: {len(tables)}")
            return tables
            
        except Exception as e:
            logger.error(f"Error obteniendo tablas: {str(e)}")
            raise e
    
    @classmethod
    def get_table_structure(cls, connection_string: str, table_name: str) -> List[Dict[str, Any]]:
        """Obtiene la estructura de una tabla"""
        logger.info(f"Obteniendo estructura de tabla: {table_name}")
        
        # Sanitizar nombre de tabla
        safe_table_name = re.sub(r'[^a-zA-Z0-9_]', '', table_name)
        
        try:
            config = cls.parse_connection_string(connection_string)
            odbc_string = cls.build_odbc_string(config)
            
            conn = pyodbc.connect(odbc_string, timeout=config['timeout'])
            cursor = conn.cursor()
            
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    CHARACTER_MAXIMUM_LENGTH,
                    NUMERIC_PRECISION,
                    NUMERIC_SCALE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{safe_table_name}'
                ORDER BY ORDINAL_POSITION
            """)
            
            columns = []
            for row in cursor.fetchall():
                columns.append({
                    'column_name': row[0],
                    'data_type': row[1],
                    'is_nullable': row[2],
                    'column_default': row[3],
                    'max_length': row[4],
                    'precision': row[5],
                    'scale': row[6]
                })
            
            cursor.close()
            conn.close()
            
            logger.info(f"Estructura obtenida para {table_name}: {len(columns)} columnas")
            return columns
            
        except Exception as e:
            logger.error(f"Error obteniendo estructura de {table_name}: {str(e)}")
            raise e