# MCP Creator Bridge - Herramientas Modulares

Un servidor MCP (Model Context Protocol) modular que proporciona herramientas para generación de CRUD en Next.js y ejecución segura de queries SQL Server.

## 🏗️ Arquitectura Modular

El proyecto está estructurado de forma modular para facilitar el mantenimiento y la adición de nuevas herramientas:

```
src/
├── index.ts              # Servidor MCP principal
├── types/
│   └── index.ts          # Tipos compartidos
├── utils/
│   ├── apiClient.ts      # Cliente HTTP para la API
│   ├── responseFormatter.ts # Formateo de respuestas
│   ├── sqlValidator.ts   # Validación de queries SQL
│   └── sqlConnection.ts  # Manejo de conexiones SQL Server
└── tools/
    ├── index.ts          # Registro de herramientas
    ├── generateCrud.ts   # Generación de CRUD
    ├── validateConfig.ts # Validación de configuraciones
    ├── getFieldTypes.ts  # Información de tipos de campo
    ├── generateExampleConfig.ts # Generación de ejemplos
    ├── executeSql.ts     # Ejecución de queries SQL
    └── getDatabaseInfo.ts # Información de base de datos
```

## 🛠️ Herramientas Disponibles

### 1. **generate_crud**
Genera un módulo CRUD completo para Next.js basado en configuración JSON.

**Entrada:**
```json
{
  "config": {
    "targetPath": "./src/modules/producto",
    "entityName": "Producto",
    "entityNamePlural": "Productos",
    "fields": [...],
    "apiEndpoint": "/api/productos",
    "permissions": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true
    }
  },
  "options": {
    "overwrite": false,
    "dryRun": false,
    "verbose": false
  }
}
```

### 2. **validate_config**
Valida una configuración CRUD sin generar archivos.

**Entrada:**
```json
{
  "config": {
    // Configuración a validar
  }
}
```

### 3. **get_field_types**
Obtiene información sobre los tipos de campo disponibles y sus validaciones.

**Entrada:**
```json
{}
```

### 4. **generate_example_config**
Genera un ejemplo de configuración para una entidad específica.

**Entrada:**
```json
{
  "entityName": "Producto",
  "complexity": "medium"  // "simple", "medium", "complex"
}
```

### 5. **execute_sql** ⭐ *Nueva*
Ejecuta queries SQL Server con restricciones de seguridad.

**Operaciones Permitidas:**
- `SELECT` - Consultar datos
- `INSERT` - Insertar registros
- `UPDATE` - Actualizar registros (recomendado usar WHERE)
- `DELETE` - Eliminar registros (recomendado usar WHERE)
- `CREATE TABLE` - Crear tablas
- `ALTER TABLE` - Modificar estructura de tablas
- `CREATE INDEX` - Crear índices
- `CREATE VIEW` - Crear vistas
- `ALTER VIEW` - Modificar vistas

**Operaciones Prohibidas:**
- `DROP DATABASE/TABLE` - Eliminar bases de datos o tablas
- `TRUNCATE` - Vaciar tablas
- `EXEC/EXECUTE` - Ejecutar procedimientos
- `SP_/XP_` - Procedimientos del sistema
- `BULK INSERT` - Importación masiva
- `SHUTDOWN/RESTORE/BACKUP` - Operaciones del servidor

**Entrada:**
```json
{
  "connectionString": "Server=localhost;Database=midb;User Id=usuario;Password=password;Encrypt=true;TrustServerCertificate=true;",
  "query": "SELECT TOP 10 * FROM Productos WHERE activo = 1",
  "maxRows": 1000
}
```

### 6. **get_database_info** ⭐ *Nueva*
Obtiene información sobre la base de datos SQL Server.

**Acciones disponibles:**
- `info` - Información general de la base de datos
- `tables` - Lista todas las tablas
- `table_structure` - Estructura de una tabla específica

**Entrada:**
```json
{
  "connectionString": "...",
  "action": "tables"
}
```

## 🔒 Seguridad SQL

### Validación de Queries
El sistema incluye un validador robusto que:

1. **Bloquea operaciones peligrosas** - DROP, TRUNCATE, EXEC, etc.
2. **Sanitiza queries** - Remueve comentarios y múltiples declaraciones
3. **Genera advertencias** - UPDATE/DELETE sin WHERE, queries muy largas
4. **Valida sintaxis** - Verifica que la operación esté permitida

### String de Conexión
⚠️ **IMPORTANTE**: El string de conexión debe enviarse como parámetro. La AI debe indicar que generalmente esta información está en el archivo `.env` del proyecto:

```env
# En tu archivo .env
SQL_CONNECTION_STRING="Server=localhost;Database=midb;User Id=usuario;Password=password;Encrypt=true;TrustServerCertificate=true;"
```

**Formatos soportados:**
```
# Formato tradicional
Server=localhost;Database=midb;User Id=usuario;Password=password;Encrypt=true;

# Formato URL
mssql://usuario:password@localhost/midb?encrypt=true&trustServerCertificate=true
```

## 🚀 Instalación y Uso

### Prerrequisitos
```bash
npm install
```

**Dependencias agregadas:**
- `mssql` - Cliente SQL Server
- `dotenv` - Variables de entorno
- `@types/mssql` - Tipos TypeScript

### Compilación
```bash
npm run build
```

### Ejecución
```bash
npm start
```

## 📝 Agregar Nuevas Herramientas

Para agregar una nueva herramienta:

1. **Crear el archivo de la herramienta** en `src/tools/`:
```typescript
// src/tools/miNuevaHerramienta.ts
import { ToolResponse } from "../types";

export class MiNuevaHerramientaTool {
  static getSchema() {
    return {
      name: "mi_nueva_herramienta",
      description: "Descripción de la herramienta",
      inputSchema: {
        type: "object",
        properties: {
          // Definir parámetros
        },
        required: ["param1"]
      }
    };
  }

  static async execute(args: any): Promise<ToolResponse> {
    // Implementar lógica
    return {
      content: [
        {
          type: "text" as const,
          text: "Resultado de la herramienta",
        },
      ],
    };
  }
}
```

2. **Registrar en el índice** (`src/tools/index.ts`):
```typescript
import { MiNuevaHerramientaTool } from "./miNuevaHerramienta";

export const tools: Record<string, MCPTool> = {
  // ... herramientas existentes
  mi_nueva_herramienta: MiNuevaHerramientaTool
};

export {
  // ... exports existentes
  MiNuevaHerramientaTool
};
```

## 🔧 Configuración MCP

Configuración para Claude Desktop (`mcp.json`):

```json
{
  "mcpServers": {
    "mcp-creator-bridge": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:8000"
      }
    }
  }
}
```

## 📊 Ejemplos de Uso

### Generación de CRUD
```json
{
  "config": {
    "targetPath": "./src/modules/producto",
    "entityName": "Producto", 
    "entityNamePlural": "Productos",
    "fields": [
      {
        "name": "nombre",
        "type": "text",
        "label": "Nombre",
        "required": true,
        "searchable": true,
        "sortable": true,
        "filterable": true,
        "showInList": true
      }
    ],
    "apiEndpoint": "/api/productos",
    "permissions": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true
    }
  }
}
```

### Query SQL Segura
```json
{
  "connectionString": "Server=localhost;Database=midb;Integrated Security=true;",
  "query": "SELECT TOP 10 Id, Nombre, Precio FROM Productos WHERE Activo = 1 ORDER BY FechaCreacion DESC",
  "maxRows": 50
}
```

### Información de Base de Datos
```json
{
  "connectionString": "Server=localhost;Database=midb;Integrated Security=true;",
  "action": "table_structure",
  "tableName": "Productos"
}
```

## ⚠️ Consideraciones Importantes

1. **Seguridad SQL**: Solo se permiten operaciones seguras, sin DROP ni TRUNCATE
2. **String de Conexión**: Debe proporcionarse desde el archivo .env del proyecto
3. **Límites**: Por defecto se limitan las consultas SELECT a 1000 filas
4. **Timeouts**: Queries con timeout de 30 segundos
5. **Validación**: Todas las queries son validadas antes de ejecutarse

## 🐛 Troubleshooting

### Error de Compilación TypeScript
- Verificar que todos los tipos estén correctamente definidos
- Usar `as const` para literales de string

### Error de Conexión SQL
- Verificar la cadena de conexión
- Comprobar que el servidor SQL Server esté accesible
- Verificar credenciales y permisos

### Error de Validación SQL
- Revisar que la query use solo operaciones permitidas
- Verificar sintaxis SQL
- Consultar la lista de operaciones prohibidas