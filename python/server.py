#!/usr/bin/env python3
"""
MCP Server para generación CRUD de Next.js (Python implementation)
Modelo Context Protocol implementation
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    ListToolsRequest,
    Tool,
    TextContent,
    CallToolResult,
    ListToolsResult
)

try:
    from .model_types import CRUDGeneratorConfig, GeneratorOptions, FieldType
    from .generators import CRUDGenerator
    from .validators import CRUDValidator
    from .utils import Logger
except ImportError:
    # Fallback para ejecución directa
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    
    from model_types import CRUDGeneratorConfig, GeneratorOptions, FieldType
    from generators import CRUDGenerator
    from validators import CRUDValidator
    from utils import Logger


class NextjsCRUDMCPServer:
    """Configuración del servidor MCP en Python"""
    
    def __init__(self):
        # Configurar server MCP
        self.server = Server("nextjs-crud-generator")
        
        # Inicializar generador
        current_dir = Path(__file__).parent
        templates_path = current_dir / "templates" / "crud"
        self.generator = CRUDGenerator(str(templates_path))
        
        self._setup_handlers()
    
    def _setup_handlers(self) -> None:
        """Configura los handlers del servidor MCP"""
        
        @self.server.list_tools()
        async def list_tools() -> ListToolsResult:
            """Handler para listar herramientas disponibles"""
            tools = [
                Tool(
                    name="generate_crud",
                    description="Genera un módulo CRUD completo para Next.js basado en configuración JSON",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "config": {
                                "type": "object",
                                "description": "Configuración completa para la generación del CRUD",
                                "properties": {
                                    "targetPath": {
                                        "type": "string",
                                        "description": "Ruta donde se generará el módulo CRUD"
                                    },
                                    "entityName": {
                                        "type": "string",
                                        "description": "Nombre de la entidad en PascalCase (ej: Producto)"
                                    },
                                    "entityNamePlural": {
                                        "type": "string",
                                        "description": "Nombre plural de la entidad (ej: Productos)"
                                    },
                                    "fields": {
                                        "type": "array",
                                        "description": "Array de campos de la entidad",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "name": {"type": "string", "description": "Nombre del campo"},
                                                "type": {
                                                    "type": "string",
                                                    "enum": ["text", "number", "email", "password", "select", "textarea", "date", "boolean", "file", "relation"],
                                                    "description": "Tipo del campo"
                                                },
                                                "label": {"type": "string", "description": "Etiqueta para mostrar"},
                                                "required": {"type": "boolean", "description": "Si el campo es obligatorio"},
                                                "searchable": {"type": "boolean", "description": "Si se puede buscar por este campo"},
                                                "sortable": {"type": "boolean", "description": "Si se puede ordenar por este campo"},
                                                "filterable": {"type": "boolean", "description": "Si se puede filtrar por este campo"},
                                                "showInList": {"type": "boolean", "description": "Si se muestra en la tabla"},
                                                "placeholder": {"type": "string", "description": "Placeholder del campo"},
                                                "validation": {
                                                    "type": "object",
                                                    "description": "Reglas de validación",
                                                    "properties": {
                                                        "min": {"type": "number"},
                                                        "max": {"type": "number"},
                                                        "pattern": {"type": "string"},
                                                        "options": {"type": "array", "items": {"type": "string"}},
                                                        "accept": {"type": "string"}
                                                    }
                                                },
                                                "relation": {
                                                    "type": "object",
                                                    "description": "Configuración para campos de relación",
                                                    "properties": {
                                                        "endpoint": {"type": "string"},
                                                        "displayField": {"type": "string"},
                                                        "valueField": {"type": "string"},
                                                        "searchFields": {"type": "array", "items": {"type": "string"}},
                                                        "multiple": {"type": "boolean"},
                                                        "preload": {"type": "boolean"},
                                                        "minChars": {"type": "number"},
                                                        "relationEntity": {"type": "string"},
                                                        "allowCreate": {"type": "boolean"}
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    "apiEndpoint": {
                                        "type": "string",
                                        "description": "Endpoint base de la API (ej: /api/productos)"
                                    },
                                    "relationEndpoints": {
                                        "type": "object",
                                        "description": "Endpoints específicos para campos de relación"
                                    },
                                    "permissions": {
                                        "type": "object",
                                        "description": "Permisos CRUD",
                                        "properties": {
                                            "create": {"type": "boolean"},
                                            "read": {"type": "boolean"},
                                            "update": {"type": "boolean"},
                                            "delete": {"type": "boolean"}
                                        }
                                    }
                                },
                                "required": ["targetPath", "entityName", "entityNamePlural", "fields", "apiEndpoint", "permissions"]
                            },
                            "options": {
                                "type": "object",
                                "description": "Opciones de generación",
                                "properties": {
                                    "overwrite": {
                                        "type": "boolean",
                                        "description": "Sobrescribir archivos existentes",
                                        "default": False
                                    },
                                    "dryRun": {
                                        "type": "boolean",
                                        "description": "Solo mostrar lo que se generaría sin crear archivos",
                                        "default": False
                                    },
                                    "verbose": {
                                        "type": "boolean",
                                        "description": "Mostrar información detallada",
                                        "default": False
                                    },
                                    "skipValidation": {
                                        "type": "boolean",
                                        "description": "Omitir validación de configuración",
                                        "default": False
                                    }
                                }
                            }
                        },
                        "required": ["config"]
                    }
                ),
                Tool(
                    name="validate_config",
                    description="Valida una configuración CRUD sin generar archivos",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "config": {
                                "type": "object",
                                "description": "Configuración a validar"
                            }
                        },
                        "required": ["config"]
                    }
                ),
                Tool(
                    name="get_field_types",
                    description="Obtiene información sobre los tipos de campo disponibles",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="generate_example_config",
                    description="Genera un ejemplo de configuración para una entidad específica",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "entityName": {
                                "type": "string",
                                "description": "Nombre de la entidad para el ejemplo"
                            },
                            "complexity": {
                                "type": "string",
                                "enum": ["simple", "medium", "complex"],
                                "description": "Nivel de complejidad del ejemplo",
                                "default": "medium"
                            }
                        },
                        "required": ["entityName"]
                    }
                )
            ]
            return ListToolsResult(tools=tools)
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handler para ejecutar herramientas"""
            try:
                if name == "generate_crud":
                    return await self._handle_generate_crud(arguments)
                elif name == "validate_config":
                    return await self._handle_validate_config(arguments)
                elif name == "get_field_types":
                    return await self._handle_get_field_types()
                elif name == "generate_example_config":
                    return await self._handle_generate_example_config(arguments)
                else:
                    raise ValueError(f"Herramienta desconocida: {name}")
                    
            except Exception as e:
                Logger.error(f"Error en herramienta {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Error: {str(e)}")]
                )
    
    async def _handle_generate_crud(self, args: Dict[str, Any]) -> CallToolResult:
        """Handler para generar CRUD"""
        # El MCP inspector anida los argumentos doble, extraer correctamente
        actual_config = args.get("config", {}).get("config") or args.get("config", {})
        actual_options = args.get("config", {}).get("options") or args.get("options", {})
        
        try:
            config = CRUDGeneratorConfig.model_validate(actual_config)
            options = GeneratorOptions.model_validate(actual_options)
        except Exception as e:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Error de validación: {str(e)}")]
            )
        
        # Verificar templates
        templates_valid = await self.generator.validate_templates_path()
        if not templates_valid:
            return CallToolResult(
                content=[TextContent(type="text", text="Error: Templates no encontrados o inválidos")]
            )
        
        # Generar CRUD
        result = await self.generator.generate(config, options)
        
        # Formatear respuesta
        response_text = f"""# Resultado de Generación CRUD

## Estado: {'✅ Exitoso' if result.success else '❌ Error'}

**Mensaje:** {result.message}

"""
        
        if result.files_created:
            response_text += f"""## Archivos Generados ({len(result.files_created)})

{chr(10).join(f"- `{file}`" for file in result.files_created)}

"""
        
        if result.errors:
            response_text += f"""## Errores

{chr(10).join(f"- {error}" for error in result.errors)}

"""
        
        if options.dry_run:
            response_text += """> **Nota:** Ejecutado en modo dry-run. No se crearon archivos reales.

"""
        
        response_text += """## Siguientes Pasos

1. Instalar dependencias requeridas:
   ```bash
   npm install @tanstack/react-query @tanstack/react-table react-hook-form @hookform/resolvers zod date-fns @heroicons/react
   ```

2. Configurar tu base de datos en las rutas API generadas
3. Personalizar los componentes según tu sistema de diseño
4. Configurar autenticación si es necesario

## Estructura Generada

- **Componentes:** Lista, Formulario, Tabla, Filtros, Búsqueda
- **Páginas:** Index, Crear, Editar
- **API Routes:** CRUD completo con validación
- **Types:** Interfaces TypeScript completas
- **Hooks:** React Query hooks optimizados
- **Validación:** Esquemas Zod para formularios y API
"""
        
        return CallToolResult(
            content=[TextContent(type="text", text=response_text)]
        )
    
    async def _handle_validate_config(self, args: Dict[str, Any]) -> CallToolResult:
        """Handler para validar configuración"""
        config = args.get("config", {})
        
        validation = CRUDValidator.validate(config)
        
        response_text = f"""# Validación de Configuración CRUD

## Estado: {'✅ Válida' if validation.valid else '❌ Inválida'}

"""
        
        if not validation.valid:
            response_text += f"""## Errores Encontrados

{chr(10).join(f"- **{error.field}:** {error.message}" for error in validation.errors)}

"""
        
        if validation.warnings:
            response_text += f"""## Advertencias

{chr(10).join(f"- {warning}" for warning in validation.warnings)}

"""
        
        if validation.valid:
            entity_name = config.get("entityName", "")
            entity_name_plural = config.get("entityNamePlural", "")
            api_endpoint = config.get("apiEndpoint", "")
            fields = config.get("fields", [])
            permissions = config.get("permissions", {})
            
            enabled_permissions = [action for action, enabled in permissions.items() if enabled]
            
            response_text += f"""## Resumen de Configuración

- **Entidad:** {entity_name} ({entity_name_plural})
- **Campos:** {len(fields)}
- **API Endpoint:** {api_endpoint}
- **Permisos:** {', '.join(enabled_permissions)}

### Análisis de Campos

{chr(10).join(self._analyze_field(field) for field in fields)}
"""
        
        return CallToolResult(
            content=[TextContent(type="text", text=response_text)]
        )
    
    def _analyze_field(self, field: Dict[str, Any]) -> str:
        """Analiza un campo para el resumen"""
        capabilities = []
        if field.get("searchable"):
            capabilities.append("Búsqueda")
        if field.get("sortable"):
            capabilities.append("Ordenamiento")
        if field.get("filterable"):
            capabilities.append("Filtrado")
        if field.get("showInList"):
            capabilities.append("Lista")
        
        return f"- **{field.get('label', '')}** ({field.get('type', '')}): {', '.join(capabilities) or 'Solo visualización'}"
    
    async def _handle_get_field_types(self) -> CallToolResult:
        """Handler para obtener tipos de campo"""
        field_types = [
            {
                "type": "text",
                "description": "Texto simple",
                "validation": ["min", "max", "pattern"],
                "example": {"name": "nombre", "type": "text", "label": "Nombre", "required": True}
            },
            {
                "type": "email",
                "description": "Dirección de correo electrónico",
                "validation": ["pattern (automático)"],
                "example": {"name": "email", "type": "email", "label": "Email", "required": True}
            },
            {
                "type": "password",
                "description": "Contraseña (oculta al escribir)",
                "validation": ["min", "max", "pattern"],
                "example": {"name": "password", "type": "password", "label": "Contraseña", "required": True}
            },
            {
                "type": "number",
                "description": "Número entero o decimal",
                "validation": ["min", "max"],
                "example": {"name": "precio", "type": "number", "label": "Precio", "required": True}
            },
            {
                "type": "textarea",
                "description": "Texto largo (múltiples líneas)",
                "validation": ["min", "max"],
                "example": {"name": "descripcion", "type": "textarea", "label": "Descripción", "required": False}
            },
            {
                "type": "select",
                "description": "Lista desplegable de opciones",
                "validation": ["options (requerido)"],
                "example": {
                    "name": "estado",
                    "type": "select",
                    "label": "Estado",
                    "required": True,
                    "validation": {"options": ["activo", "inactivo"]}
                }
            },
            {
                "type": "boolean",
                "description": "Verdadero/Falso (checkbox)",
                "validation": [],
                "example": {"name": "activo", "type": "boolean", "label": "Activo", "required": True}
            },
            {
                "type": "date",
                "description": "Fecha (selector de calendario)",
                "validation": [],
                "example": {"name": "fechaCreacion", "type": "date", "label": "Fecha de Creación", "required": True}
            },
            {
                "type": "file",
                "description": "Archivo (upload)",
                "validation": ["accept (tipos MIME)"],
                "example": {
                    "name": "imagen",
                    "type": "file",
                    "label": "Imagen",
                    "required": False,
                    "validation": {"accept": "image/*"}
                }
            },
            {
                "type": "relation",
                "description": "Relación con otra entidad",
                "validation": ["relation (configuración completa requerida)"],
                "example": {
                    "name": "categoria",
                    "type": "relation",
                    "label": "Categoría",
                    "required": True,
                    "relation": {
                        "endpoint": "/api/categorias/search",
                        "displayField": "nombre",
                        "valueField": "id",
                        "searchFields": ["nombre"],
                        "multiple": False,
                        "preload": False,
                        "minChars": 2,
                        "relationEntity": "Categoria",
                        "allowCreate": False
                    }
                }
            }
        ]
        
        response_text = "# Tipos de Campo Disponibles\n\n"
        
        for field_type in field_types:
            response_text += f"""## {field_type['type']}

**Descripción:** {field_type['description']}

**Validaciones disponibles:** {', '.join(field_type['validation']) if field_type['validation'] else 'Ninguna'}

**Ejemplo:**
```json
{json.dumps(field_type['example'], indent=2, ensure_ascii=False)}
```

"""
        
        response_text += """## Propiedades Comunes para Todos los Campos

- **name**: Nombre del campo (camelCase, requerido)
- **type**: Tipo del campo (requerido)
- **label**: Etiqueta para mostrar (requerido)
- **required**: Si el campo es obligatorio (boolean, requerido)
- **searchable**: Si se puede buscar por este campo (boolean, requerido)
- **sortable**: Si se puede ordenar por este campo (boolean, requerido)
- **filterable**: Si se puede filtrar por este campo (boolean, requerido)
- **showInList**: Si se muestra en la tabla (boolean, requerido)
- **placeholder**: Texto de placeholder (opcional)

## Configuración de Relaciones

Para campos de tipo `relation`, la configuración completa es:

```json
{
  "relation": {
    "endpoint": "/api/entidad/search",
    "displayField": "nombre",
    "valueField": "id", 
    "searchFields": ["nombre", "codigo"],
    "multiple": false,
    "preload": false,
    "minChars": 2,
    "relationEntity": "NombreEntidad",
    "allowCreate": false
  }
}
```
"""
        
        return CallToolResult(
            content=[TextContent(type="text", text=response_text)]
        )
    
    async def _handle_generate_example_config(self, args: Dict[str, Any]) -> CallToolResult:
        """Handler para generar configuración de ejemplo"""
        entity_name = args.get("entityName", "")
        complexity = args.get("complexity", "medium")
        
        examples = {
            "simple": self._generate_simple_example(entity_name),
            "medium": self._generate_medium_example(entity_name),
            "complex": self._generate_complex_example(entity_name)
        }
        
        example = examples.get(complexity, examples["medium"])
        
        response_text = f"""# Configuración de Ejemplo: {entity_name}

## Nivel de Complejidad: {complexity}

```json
{json.dumps(example, indent=2, ensure_ascii=False)}
```

## Cómo Usar Esta Configuración

1. Copia la configuración JSON de arriba
2. Ajusta los campos según tus necesidades específicas
3. Modifica los endpoints de la API
4. Ejecuta el generador CRUD con esta configuración

## Campos Incluidos en Este Ejemplo

{chr(10).join(f"- **{field['label']}** ({field['type']}): {'Requerido' if field['required'] else 'Opcional'}" for field in example['fields'])}

## Personalización

Puedes personalizar esta configuración:

- Agregar o quitar campos
- Cambiar tipos de campo
- Ajustar validaciones
- Modificar permisos
- Configurar relaciones específicas
"""
        
        return CallToolResult(
            content=[TextContent(type="text", text=response_text)]
        )
    
    def _generate_simple_example(self, entity_name: str) -> Dict[str, Any]:
        """Genera ejemplo simple"""
        name = entity_name.lower()
        pascal_name = entity_name.capitalize()
        plural_name = f"{pascal_name}s"
        
        return {
            "targetPath": f"./src/modules/{name}",
            "entityName": pascal_name,
            "entityNamePlural": plural_name,
            "fields": [
                {
                    "name": "nombre",
                    "type": "text",
                    "label": "Nombre",
                    "required": True,
                    "validation": {"min": 2, "max": 100},
                    "searchable": True,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True,
                    "placeholder": f"Nombre del {name}"
                },
                {
                    "name": "activo",
                    "type": "boolean",
                    "label": "Activo",
                    "required": True,
                    "searchable": False,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True
                }
            ],
            "apiEndpoint": f"/api/{name}s",
            "permissions": {
                "create": True,
                "read": True,
                "update": True,
                "delete": True
            }
        }
    
    def _generate_medium_example(self, entity_name: str) -> Dict[str, Any]:
        """Genera ejemplo medio"""
        name = entity_name.lower()
        pascal_name = entity_name.capitalize()
        plural_name = f"{pascal_name}s"
        
        return {
            "targetPath": f"./src/modules/{name}",
            "entityName": pascal_name,
            "entityNamePlural": plural_name,
            "fields": [
                {
                    "name": "nombre",
                    "type": "text",
                    "label": "Nombre",
                    "required": True,
                    "validation": {"min": 2, "max": 100},
                    "searchable": True,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True,
                    "placeholder": f"Nombre del {name}"
                },
                {
                    "name": "descripcion",
                    "type": "textarea",
                    "label": "Descripción",
                    "required": False,
                    "validation": {"max": 500},
                    "searchable": True,
                    "sortable": False,
                    "filterable": False,
                    "showInList": False,
                    "placeholder": "Descripción opcional"
                },
                {
                    "name": "email",
                    "type": "email",
                    "label": "Email",
                    "required": True,
                    "searchable": True,
                    "sortable": True,
                    "filterable": False,
                    "showInList": True,
                    "placeholder": "correo@ejemplo.com"
                },
                {
                    "name": "estado",
                    "type": "select",
                    "label": "Estado",
                    "required": True,
                    "validation": {"options": ["activo", "inactivo", "pendiente"]},
                    "searchable": False,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True
                },
                {
                    "name": "fechaCreacion",
                    "type": "date",
                    "label": "Fecha de Creación",
                    "required": True,
                    "searchable": False,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True
                }
            ],
            "apiEndpoint": f"/api/{name}s",
            "permissions": {
                "create": True,
                "read": True,
                "update": True,
                "delete": True
            }
        }
    
    def _generate_complex_example(self, entity_name: str) -> Dict[str, Any]:
        """Genera ejemplo complejo"""
        name = entity_name.lower()
        pascal_name = entity_name.capitalize()
        plural_name = f"{pascal_name}s"
        
        return {
            "targetPath": f"./src/modules/{name}",
            "entityName": pascal_name,
            "entityNamePlural": plural_name,
            "fields": [
                {
                    "name": "nombre",
                    "type": "text",
                    "label": "Nombre",
                    "required": True,
                    "validation": {"min": 2, "max": 100},
                    "searchable": True,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True,
                    "placeholder": f"Nombre del {name}"
                },
                {
                    "name": "descripcion",
                    "type": "textarea",
                    "label": "Descripción",
                    "required": False,
                    "validation": {"max": 1000},
                    "searchable": True,
                    "sortable": False,
                    "filterable": False,
                    "showInList": False,
                    "placeholder": "Descripción detallada"
                },
                {
                    "name": "categoria",
                    "type": "relation",
                    "label": "Categoría",
                    "required": True,
                    "searchable": True,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True,
                    "placeholder": "Selecciona una categoría",
                    "relation": {
                        "endpoint": "/api/categorias/search",
                        "displayField": "nombre",
                        "valueField": "id",
                        "searchFields": ["nombre", "codigo"],
                        "multiple": False,
                        "preload": False,
                        "minChars": 2,
                        "relationEntity": "Categoria",
                        "allowCreate": True
                    }
                },
                {
                    "name": "precio",
                    "type": "number",
                    "label": "Precio",
                    "required": True,
                    "validation": {"min": 0},
                    "searchable": False,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True,
                    "placeholder": "0.00"
                },
                {
                    "name": "imagen",
                    "type": "file",
                    "label": "Imagen",
                    "required": False,
                    "validation": {"accept": "image/*"},
                    "searchable": False,
                    "sortable": False,
                    "filterable": False,
                    "showInList": False
                },
                {
                    "name": "activo",
                    "type": "boolean",
                    "label": "Activo",
                    "required": True,
                    "searchable": False,
                    "sortable": True,
                    "filterable": True,
                    "showInList": True
                }
            ],
            "apiEndpoint": f"/api/{name}s",
            "relationEndpoints": {
                "categoria": "/api/categorias"
            },
            "permissions": {
                "create": True,
                "read": True,
                "update": True,
                "delete": True
            }
        }
    
    async def start(self) -> None:
        """Inicia el servidor MCP"""
        # Desactivar logs para MCP (stdout debe ser solo JSON)
        Logger.set_enabled(False)
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(read_stream, write_stream, self.server.create_initialization_options())


async def main():
    """Función principal"""
    server = NextjsCRUDMCPServer()
    await server.start()


if __name__ == "__main__":
    asyncio.run(main())