# MCP CRUD Generator - Python Implementation

Este es un puerto en Python del generador CRUD MCP original de TypeScript, que genera módulos CRUD completos para Next.js basado en configuraciones JSON.

## 🌟 Características

- **Generación completa de CRUD**: Componentes, páginas, API routes, hooks, tipos y validaciones
- **Plantillas Jinja2**: Sistema de plantillas robusto y extensible
- **Validación Pydantic**: Validación robusta de configuraciones
- **Compatible con MCP**: Implementa completamente el protocolo MCP
- **Misma funcionalidad**: Mantiene todas las características de la versión TypeScript

## 📁 Estructura del Proyecto

```
python/
├── __init__.py              # Módulo principal
├── server.py               # Servidor MCP principal
├── types.py                # Tipos y modelos Pydantic
├── utils.py                # Utilidades (strings, archivos, logging)
├── validators.py           # Validadores de configuración
├── generators.py           # Generador principal CRUD
├── templates/              # Plantillas copiadas del original
├── requirements.txt        # Dependencias Python
├── mcp.json               # Configuración MCP
└── README.md              # Esta documentación
```

## 🚀 Instalación

1. **Instalar dependencias Python:**
   ```bash
   cd python
   pip install -r requirements.txt
   ```

2. **Configurar el MCP:**
   - Copia el contenido de `python/mcp.json` a tu configuración de Claude Code
   - O ejecuta directamente: `python -m python.server`

## 🛠️ Herramientas Disponibles

### 1. `generate_crud`
Genera un módulo CRUD completo basado en configuración JSON.

**Parámetros:**
- `config`: Configuración completa del CRUD
- `options`: Opciones de generación (overwrite, dryRun, verbose, skipValidation)

### 2. `validate_config`
Valida una configuración CRUD sin generar archivos.

### 3. `get_field_types`
Obtiene información sobre todos los tipos de campo disponibles.

### 4. `generate_example_config`
Genera ejemplos de configuración (simple, medium, complex).

## 📋 Ejemplo de Configuración

```json
{
  "targetPath": "./src/modules/productos",
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
      "showInList": true,
      "validation": {
        "min": 2,
        "max": 100
      }
    },
    {
      "name": "precio",
      "type": "number",
      "label": "Precio",
      "required": true,
      "searchable": false,
      "sortable": true,
      "filterable": true,
      "showInList": true,
      "validation": {
        "min": 0
      }
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
```

## 🔧 Tipos de Campo Soportados

- **text**: Texto simple
- **email**: Correo electrónico
- **password**: Contraseña
- **number**: Número
- **textarea**: Texto largo
- **select**: Lista desplegable
- **boolean**: Verdadero/Falso
- **date**: Fecha
- **file**: Archivo
- **relation**: Relación con otra entidad

## 🚀 Uso Programático

```python
from python.generators import CRUDGenerator
from python.types import CRUDGeneratorConfig, GeneratorOptions

# Crear generador
generator = CRUDGenerator()

# Configuración
config = CRUDGeneratorConfig.model_validate({
    "targetPath": "./output",
    "entityName": "Producto",
    "entityNamePlural": "Productos",
    # ... resto de configuración
})

# Opciones
options = GeneratorOptions(
    overwrite=True,
    verbose=True
)

# Generar
result = await generator.generate(config, options)
print(f"Generados {len(result.files_created)} archivos")
```

## ⚙️ Diferencias con la Versión TypeScript

### Similitudes
- ✅ Misma funcionalidad completa
- ✅ Mismas herramientas MCP
- ✅ Mismos templates
- ✅ Misma estructura de salida
- ✅ Misma validación

### Diferencias Técnicas
- 🐍 **Python vs Node.js**: Runtime diferente
- 📋 **Pydantic vs Zod**: Validación en Python
- 🎨 **Jinja2 vs Handlebars**: Sistema de templates
- 📦 **pip vs npm**: Gestión de dependencias

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
python -m pytest python/tests/

# Validar configuración de ejemplo
python -c "
from python.validators import CRUDValidator
result = CRUDValidator.validate({
    'targetPath': './test',
    'entityName': 'Test',
    'entityNamePlural': 'Tests',
    'fields': [{'name': 'nombre', 'type': 'text', 'label': 'Nombre', 'required': True, 'searchable': True, 'sortable': True, 'filterable': True, 'showInList': True}],
    'apiEndpoint': '/api/tests',
    'permissions': {'create': True, 'read': True, 'update': True, 'delete': True}
})
print('Válido:', result.valid)
"
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature
3. Implementa tus cambios
4. Añade tests si es necesario
5. Envía un pull request

## 📄 Licencia

MIT - Mismo que el proyecto original

## 🔗 Enlaces

- [Proyecto Original TypeScript](../README.md)
- [Documentación MCP](https://docs.anthropic.com/claude/docs/mcp)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [Jinja2 Docs](https://jinja.palletsprojects.com/)

---

**¡El generador CRUD ahora disponible en Python! 🐍✨**