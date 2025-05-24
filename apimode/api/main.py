from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import json
from pathlib import Path
from crud_generator import CRUDGenerator
from model_types import CRUDGeneratorConfig, GeneratorOptions
from validators import CRUDValidator
from sql_utils import SqlValidator, SqlConnection

app = FastAPI(title="MCP Creator API", version="1.0.0")

class GenerateRequest(BaseModel):
    entity_name: str
    entity_name_plural: Optional[str] = None
    fields: list[Dict[str, Any]]
    template_type: str = "crud"
    output_path: Optional[str] = None
    api_endpoint: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = None
    options: Optional[Dict[str, Any]] = None

class GenerateResponse(BaseModel):
    success: bool
    message: str
    generated_files: list[str] = []
    errors: Optional[list[str]] = None

class ValidateRequest(BaseModel):
    config: Dict[str, Any]

class ValidationError(BaseModel):
    field: str
    message: str
    code: str

class ValidateResponse(BaseModel):
    valid: bool
    errors: List[ValidationError] = []
    warnings: List[str] = []

class ExampleConfigRequest(BaseModel):
    entity_name: str
    complexity: str = "medium"

class ExampleConfigResponse(BaseModel):
    config: Dict[str, Any]

class FieldType(BaseModel):
    type: str
    description: str
    validation: List[str]
    example: Dict[str, Any]

class FieldTypesResponse(BaseModel):
    field_types: List[FieldType]

# Inicializar generador
current_dir = Path(__file__).parent
templates_path = current_dir / "templates" / "crud"
generator = CRUDGenerator(str(templates_path))

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}

@app.post("/generate", response_model=GenerateResponse)
async def generate_templates(request: GenerateRequest):
    try:
        # Verificar que los templates existen
        templates_valid = await generator.validate_templates_path()
        if not templates_valid:
            raise HTTPException(
                status_code=500, 
                detail="Templates not found or invalid"
            )
        
        # Construir configuración completa
        entity_name_plural = request.entity_name_plural or f"{request.entity_name}s"
        api_endpoint = request.api_endpoint or f"/api/{request.entity_name.lower()}s"
        output_path = request.output_path or f"./generated/{request.entity_name.lower()}"
        
        permissions = request.permissions or {
            "create": True,
            "read": True,
            "update": True,
            "delete": True
        }
        
        config_data = {
            "targetPath": output_path,
            "entityName": request.entity_name,
            "entityNamePlural": entity_name_plural,
            "fields": request.fields,
            "apiEndpoint": api_endpoint,
            "permissions": permissions
        }
        
        config = CRUDGeneratorConfig.model_validate(config_data)
        
        # Opciones de generación
        options_data = request.options or {}
        options = GeneratorOptions.model_validate(options_data)
        
        # Generar CRUD
        result = await generator.generate(config, options)
        
        return GenerateResponse(
            success=result.success,
            message=result.message,
            generated_files=result.files_created,
            errors=result.errors
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate", response_model=ValidateResponse)
async def validate_config(request: ValidateRequest):
    try:
        validation = CRUDValidator.validate(request.config)
        
        return ValidateResponse(
            valid=validation.valid,
            errors=[
                ValidationError(
                    field=error.field,
                    message=error.message,
                    code=error.code
                ) for error in validation.errors
            ],
            warnings=validation.warnings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/field-types", response_model=FieldTypesResponse)
async def get_field_types():
    try:
        field_types = [
            FieldType(
                type='text',
                description='Texto simple',
                validation=['min', 'max', 'pattern'],
                example={'name': 'nombre', 'type': 'text', 'label': 'Nombre', 'required': True}
            ),
            FieldType(
                type='email',
                description='Dirección de correo electrónico',
                validation=['pattern (automático)'],
                example={'name': 'email', 'type': 'email', 'label': 'Email', 'required': True}
            ),
            FieldType(
                type='password',
                description='Contraseña (oculta al escribir)',
                validation=['min', 'max', 'pattern'],
                example={'name': 'password', 'type': 'password', 'label': 'Contraseña', 'required': True}
            ),
            FieldType(
                type='number',
                description='Número entero o decimal',
                validation=['min', 'max'],
                example={'name': 'precio', 'type': 'number', 'label': 'Precio', 'required': True}
            ),
            FieldType(
                type='textarea',
                description='Texto largo (múltiples líneas)',
                validation=['min', 'max'],
                example={'name': 'descripcion', 'type': 'textarea', 'label': 'Descripción', 'required': False}
            ),
            FieldType(
                type='select',
                description='Lista desplegable de opciones',
                validation=['options (requerido)'],
                example={
                    'name': 'estado',
                    'type': 'select',
                    'label': 'Estado',
                    'required': True,
                    'validation': {'options': ['activo', 'inactivo']}
                }
            ),
            FieldType(
                type='boolean',
                description='Verdadero/Falso (checkbox)',
                validation=[],
                example={'name': 'activo', 'type': 'boolean', 'label': 'Activo', 'required': True}
            ),
            FieldType(
                type='date',
                description='Fecha (selector de calendario)',
                validation=[],
                example={'name': 'fechaCreacion', 'type': 'date', 'label': 'Fecha de Creación', 'required': True}
            ),
            FieldType(
                type='file',
                description='Archivo (upload)',
                validation=['accept (tipos MIME)'],
                example={
                    'name': 'imagen',
                    'type': 'file',
                    'label': 'Imagen',
                    'required': False,
                    'validation': {'accept': 'image/*'}
                }
            ),
            FieldType(
                type='relation',
                description='Relación con otra entidad',
                validation=['relation (configuración completa requerida)'],
                example={
                    'name': 'categoria',
                    'type': 'relation',
                    'label': 'Categoría',
                    'required': True,
                    'relation': {
                        'endpoint': '/api/categorias/search',
                        'displayField': 'nombre',
                        'valueField': 'id',
                        'searchFields': ['nombre'],
                        'multiple': False,
                        'preload': False,
                        'minChars': 2,
                        'relationEntity': 'Categoria',
                        'allowCreate': False
                    }
                }
            )
        ]
        
        return FieldTypesResponse(field_types=field_types)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/example-config", response_model=ExampleConfigResponse)
async def generate_example_config(request: ExampleConfigRequest):
    try:
        entity_name = request.entity_name
        complexity = request.complexity
        
        # Generar configuración según complejidad
        if complexity == "simple":
            config = generate_simple_example(entity_name)
        elif complexity == "complex":
            config = generate_complex_example(entity_name)
        else:  # medium
            config = generate_medium_example(entity_name)
            
        return ExampleConfigResponse(config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_simple_example(entity_name: str) -> Dict[str, Any]:
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

def generate_medium_example(entity_name: str) -> Dict[str, Any]:
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

def generate_complex_example(entity_name: str) -> Dict[str, Any]:
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
                "name": "tags",
                "type": "relation",
                "label": "Etiquetas",
                "required": False,
                "searchable": False,
                "sortable": False,
                "filterable": True,
                "showInList": True,
                "placeholder": "Selecciona etiquetas",
                "relation": {
                    "endpoint": "/api/tags/search",
                    "displayField": "nombre",
                    "valueField": "id",
                    "searchFields": ["nombre"],
                    "multiple": True,
                    "preload": True,
                    "minChars": 1,
                    "relationEntity": "Tag",
                    "allowCreate": False
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
            "categoria": "/api/categorias",
            "tags": "/api/tags"
        },
        "permissions": {
            "create": True,
            "read": True,
            "update": True,
            "delete": True
        }
    }

# ================================
# ENDPOINTS SQL
# ================================

class ExecuteSqlRequest(BaseModel):
    connection_string: str
    query: str
    max_rows: int = 1000

class ExecuteSqlResponse(BaseModel):
    success: bool
    query_type: str
    execution_time_ms: Optional[int] = None
    rows_affected: Optional[int] = None
    data: List[List[Any]] = []
    columns: List[str] = []
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None

class DatabaseInfoRequest(BaseModel):
    connection_string: str
    action: str  # 'info', 'tables', 'table_structure'
    table_name: Optional[str] = None

class DatabaseInfoResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: Optional[str] = None

@app.post("/execute-sql", response_model=ExecuteSqlResponse)
async def execute_sql(request: ExecuteSqlRequest):
    try:
        # Validar la query
        validation = SqlValidator.validate(request.query)
        
        if not validation['is_valid']:
            return ExecuteSqlResponse(
                success=False,
                query_type=validation['query_type'],
                errors=validation['errors'],
                warnings=validation['warnings']
            )
        
        # Sanitizar query
        clean_query = SqlValidator.sanitize_query(request.query)
        
        # Ejecutar query
        import time
        start_time = time.time()
        
        result = SqlConnection.execute_query(
            request.connection_string,
            clean_query,
            request.max_rows
        )
        
        execution_time = int((time.time() - start_time) * 1000)
        
        if result['success']:
            return ExecuteSqlResponse(
                success=True,
                query_type=validation['query_type'],
                execution_time_ms=execution_time,
                rows_affected=result['rows_affected'],
                data=result['data'],
                columns=result['columns'],
                warnings=validation['warnings']
            )
        else:
            return ExecuteSqlResponse(
                success=False,
                query_type=validation['query_type'],
                execution_time_ms=execution_time,
                errors=[result['error']],
                warnings=validation['warnings']
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/database-info", response_model=DatabaseInfoResponse)
async def get_database_info(request: DatabaseInfoRequest):
    try:
        if request.action == 'info':
            info = SqlConnection.get_database_info(request.connection_string)
            return DatabaseInfoResponse(
                success=True,
                data=info,
                message="Información de base de datos obtenida exitosamente"
            )
        
        elif request.action == 'tables':
            tables = SqlConnection.get_tables(request.connection_string)
            return DatabaseInfoResponse(
                success=True,
                data={'tables': tables, 'count': len(tables)},
                message=f"Se encontraron {len(tables)} tablas"
            )
        
        elif request.action == 'table_structure':
            if not request.table_name:
                raise HTTPException(status_code=400, detail="table_name es requerido para action='table_structure'")
            
            structure = SqlConnection.get_table_structure(
                request.connection_string, 
                request.table_name
            )
            return DatabaseInfoResponse(
                success=True,
                data={
                    'table_name': request.table_name,
                    'columns': structure,
                    'column_count': len(structure)
                },
                message=f"Estructura de tabla {request.table_name} obtenida exitosamente"
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Acción no válida: {request.action}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)