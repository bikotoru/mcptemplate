# NextJS CRUD Generator MCP

Un Model Context Protocol (MCP) server que genera módulos CRUD completos para aplicaciones Next.js con TypeScript, React Query, Zod validation y componentes reutilizables.

## 🚀 Características

- **Generación Completa**: Crea componentes, páginas, API routes, hooks, tipos y validaciones
- **TypeScript**: Tipado completo y seguro
- **React Query**: Gestión optimizada del estado del servidor
- **Validación Zod**: Esquemas de validación robustos
- **Componentes Modernos**: UI con Tailwind CSS y Heroicons
- **Relaciones**: Soporte completo para entidades relacionadas
- **Filtros Avanzados**: Sistema de filtrado y búsqueda dinámico
- **Permisos**: Control granular de operaciones CRUD
- **Configuración JSON**: Fácil configuración mediante archivos JSON

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/nextjs-crud-generator-mcp.git
cd nextjs-crud-generator-mcp

# Instalar dependencias
npm install

# Construir el proyecto
npm run build
```

## 🔧 Configuración

### 1. Configurar MCP Client

Agrega el servidor MCP a tu configuración (Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "nextjs-crud-generator": {
      "command": "node",
      "args": ["ruta/al/proyecto/dist/index.js"]
    }
  }
}
```

### 2. Verificar Instalación

```bash
# Ejecutar tests
npm test

# Ejecutar ejemplo
npm run example
```

## 🎯 Uso Básico

### Con MCP Client (Claude, etc.)

1. **Generar configuración de ejemplo**:
   ```
   Usa la herramienta generate_example_config con entityName="Producto"
   ```

2. **Validar configuración**:
   ```
   Usa la herramienta validate_config con tu configuración JSON
   ```

3. **Generar CRUD**:
   ```
   Usa la herramienta generate_crud con config y options
   ```

### Programáticamente

```typescript
import { CRUDGenerator } from '@mcpcreador/nextjs-crud-generator';

const generator = new CRUDGenerator();

const config = {
  targetPath: './src/modules/productos',
  entityName: 'Producto',
  entityNamePlural: 'Productos',
  fields: [
    {
      name: 'nombre',
      type: 'text',
      label: 'Nombre',
      required: true,
      searchable: true,
      sortable: true,
      filterable: true,
      showInList: true
    }
    // ... más campos
  ],
  apiEndpoint: '/api/productos',
  permissions: {
    create: true,
    read: true,
    update: true,
    delete: true
  }
};

const result = await generator.generate(config);
```

## 📋 Configuración de Entidad

### Estructura Básica

```json
{
  "targetPath": "./src/modules/entidad",
  "entityName": "MiEntidad",
  "entityNamePlural": "MisEntidades",
  "fields": [...],
  "apiEndpoint": "/api/mi-entidad",
  "permissions": {...}
}
```

### Tipos de Campo Disponibles

#### Campos Básicos
- `text`: Texto simple
- `email`: Email con validación
- `password`: Contraseña oculta
- `number`: Números con validación de rango
- `textarea`: Texto largo
- `boolean`: Verdadero/Falso
- `date`: Selector de fecha
- `file`: Upload de archivos

#### Campo Select
```json
{
  "name": "estado",
  "type": "select",
  "label": "Estado",
  "required": true,
  "validation": {
    "options": ["activo", "inactivo", "pendiente"]
  }
}
```

#### Campos de Relación
```json
{
  "name": "categoria",
  "type": "relation",
  "label": "Categoría",
  "required": true,
  "relation": {
    "endpoint": "/api/categorias/search",
    "displayField": "nombre",
    "valueField": "id",
    "searchFields": ["nombre", "codigo"],
    "multiple": false,
    "preload": false,
    "minChars": 2,
    "relationEntity": "Categoria",
    "allowCreate": true
  }
}
```

### Propiedades de Campo

- `searchable`: Incluir en búsqueda global
- `sortable`: Permitir ordenamiento
- `filterable`: Mostrar en filtros
- `showInList`: Mostrar en tabla principal
- `required`: Campo obligatorio
- `validation`: Reglas de validación (min, max, pattern, etc.)

## 🏗️ Estructura Generada

```
target-path/
├── components/
│   ├── EntityList.tsx          # Lista principal con filtros
│   ├── EntityForm.tsx          # Formulario crear/editar
│   ├── EntityTable.tsx         # Tabla con ordenamiento
│   ├── EntityFilter.tsx        # Filtros avanzados
│   └── EntitySearch.tsx        # Búsqueda con sugerencias
├── pages/
│   └── entity/
│       ├── index.tsx           # Página principal
│       ├── create.tsx          # Página de creación
│       └── [id]/
│           └── edit.tsx        # Página de edición
├── api/
│   └── entity/
│       ├── index.ts            # GET (lista) y POST (crear)
│       └── [id].ts             # GET, PUT, DELETE por ID
├── types/
│   └── entity.ts               # Tipos TypeScript
├── hooks/
│   └── useEntity.ts            # React Query hooks
├── validation/
│   └── entity.ts               # Esquemas Zod
└── README.md                   # Documentación
```

## 🎨 Componentes Generados

### Lista (EntityList)
- Tabla responsiva con paginación
- Búsqueda en tiempo real
- Filtros avanzados
- Ordenamiento por columnas
- Selección múltiple
- Acciones CRUD según permisos

### Formulario (EntityForm)
- Validación en tiempo real
- Campos dinámicos según configuración
- Autocomplete para relaciones
- Estados de carga
- Modo crear/editar

### Hooks Personalizados
- `useEntityList`: Lista con filtros y paginación
- `useEntity`: Obtener entidad por ID
- `useEntityMutations`: Operaciones CRUD
- `useEntityForm`: Hook para formularios

## 🔗 Dependencias Requeridas

Tu proyecto Next.js debe tener estas dependencias:

```json
{
  "@tanstack/react-query": "^5.0.0",
  "@tanstack/react-table": "^8.0.0",
  "react-hook-form": "^7.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.22.0",
  "date-fns": "^2.30.0",
  "@heroicons/react": "^2.0.0"
}
```

## 📝 Ejemplos

Ver la carpeta `examples/` para configuraciones de ejemplo:

- `producto-config.json`: Ejemplo complejo con relaciones
- `usuario-config.json`: Ejemplo simple para gestión de usuarios
- `generate-example.js`: Script para generar ejemplos

## 🔧 Herramientas MCP

### `generate_crud`
Genera un módulo CRUD completo.

**Parámetros:**
- `config`: Configuración de la entidad (requerido)
- `options`: Opciones de generación (opcional)

### `validate_config`
Valida una configuración sin generar archivos.

**Parámetros:**
- `config`: Configuración a validar

### `get_field_types`
Obtiene información sobre tipos de campo disponibles.

### `generate_example_config`
Genera configuración de ejemplo para una entidad.

**Parámetros:**
- `entityName`: Nombre de la entidad
- `complexity`: Nivel de complejidad (simple, medium, complex)

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 🔨 Desarrollo

```bash
# Modo desarrollo (watch)
npm run dev

# Linting
npm run lint

# Formateo
npm run format

# Build
npm run build
```

## 📁 Estructura del Proyecto

```
src/
├── generators/           # Lógica principal de generación
├── templates/           # Templates de Handlebars
│   └── crud/           # Templates CRUD
├── types/              # Tipos TypeScript
├── utils/              # Utilidades
├── validators/         # Validadores Zod
└── index.ts           # Servidor MCP
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

- Abrir un [issue](https://github.com/tu-usuario/nextjs-crud-generator-mcp/issues) para reportar bugs
- Revisar la [documentación](docs/) para más detalles
- Ejemplos en la carpeta `examples/`

## 🗺️ Roadmap

- [ ] Soporte para más tipos de campo
- [ ] Templates personalizables
- [ ] Generación de tests automáticos
- [ ] Soporte para diferentes ORMs
- [ ] Internacionalización (i18n)
- [ ] Temas de UI personalizables
- [ ] Generación de documentación API
- [ ] CLI independiente

---

Desarrollado con ❤️ para la comunidad Next.js
