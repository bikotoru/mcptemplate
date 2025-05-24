"""
Tipos principales para el generador CRUD de Next.js (migrados desde TypeScript)
"""

from typing import List, Dict, Optional, Any, Literal, Union
from pydantic import BaseModel, Field
from enum import Enum

# Tipos de campo soportados
class FieldType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    EMAIL = "email"
    PASSWORD = "password"
    SELECT = "select"
    TEXTAREA = "textarea"
    DATE = "date"
    BOOLEAN = "boolean"
    FILE = "file"
    RELATION = "relation"

# Configuración de validación para campos
class FieldValidation(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None
    pattern: Optional[str] = None
    options: Optional[List[str]] = None
    accept: Optional[str] = None  # Para archivos (mime types)

# Configuración de relaciones entre entidades
class FieldRelation(BaseModel):
    endpoint: str
    display_field: str = Field(alias="displayField")
    value_field: str = Field(alias="valueField")
    search_fields: List[str] = Field(alias="searchFields")
    multiple: bool
    preload: bool
    min_chars: int = Field(alias="minChars")
    relation_entity: str = Field(alias="relationEntity")
    allow_create: bool = Field(alias="allowCreate")

    class Config:
        populate_by_name = True

# Definición de un campo de entidad
class EntityField(BaseModel):
    name: str
    type: FieldType
    label: str
    required: bool
    validation: Optional[FieldValidation] = None
    relation: Optional[FieldRelation] = None
    searchable: bool
    sortable: bool
    filterable: bool
    show_in_list: bool = Field(alias="showInList")
    placeholder: Optional[str] = None

    class Config:
        populate_by_name = True

# Permisos CRUD
class CRUDPermissions(BaseModel):
    create: bool
    read: bool
    update: bool
    delete: bool

# Configuración completa para generar un CRUD
class CRUDGeneratorConfig(BaseModel):
    target_path: str = Field(alias="targetPath")
    entity_name: str = Field(alias="entityName")
    entity_name_plural: str = Field(alias="entityNamePlural")
    fields: List[EntityField]
    api_endpoint: str = Field(alias="apiEndpoint")
    relation_endpoints: Optional[Dict[str, str]] = Field(default=None, alias="relationEndpoints")
    permissions: CRUDPermissions

    class Config:
        populate_by_name = True

# Resultado de la generación
class GenerationResult(BaseModel):
    success: bool
    message: str
    files_created: List[str] = Field(alias="filesCreated")
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None

    class Config:
        populate_by_name = True

# Opciones para el generador
class GeneratorOptions(BaseModel):
    overwrite: bool = False
    dry_run: bool = Field(default=False, alias="dryRun")
    verbose: bool = False
    skip_validation: bool = Field(default=False, alias="skipValidation")

    class Config:
        populate_by_name = True

# Contexto del template para Handlebars/Jinja2
class TemplateContext(BaseModel):
    ENTITY_NAME: str
    ENTITY_NAME_LOWER: str
    ENTITY_NAME_UPPER: str
    ENTITY_NAME_PLURAL: str
    ENTITY_NAME_PLURAL_LOWER: str
    API_ENDPOINT: str
    FIELDS: List[EntityField]
    PERMISSIONS: CRUDPermissions
    RELATION_ENDPOINTS: Dict[str, str]
    TIMESTAMP: str
    VERSION: str

# Metadatos de archivos generados
class GeneratedFile(BaseModel):
    path: str
    type: Literal['component', 'page', 'api', 'type', 'hook', 'validation', 'other']
    description: str
    dependencies: Optional[List[str]] = None

# Configuración del MCP
class MCPConfig(BaseModel):
    templates_path: str = Field(alias="templatesPath")
    output_path: str = Field(alias="outputPath")
    default_permissions: CRUDPermissions = Field(alias="defaultPermissions")
    supported_field_types: List[FieldType] = Field(alias="supportedFieldTypes")
    required_dependencies: List[str] = Field(alias="requiredDependencies")

    class Config:
        populate_by_name = True

# Errores personalizados
class CRUDGeneratorError(Exception):
    def __init__(self, message: str, code: str, details: Any = None):
        super().__init__(message)
        self.code = code
        self.details = details

# Tipos para validación
class ValidationError(BaseModel):
    field: str
    message: str
    code: str

class ValidationResult(BaseModel):
    valid: bool
    errors: List[ValidationError]
    warnings: List[str]

# Helper types para TypeScript templates
TypeScriptType = Literal['string', 'number', 'boolean', 'Date', 'File', 'any']

# Configuración de dependencias
class DependencyConfig(BaseModel):
    name: str
    version: str
    required: bool
    description: str

class ProjectDependencies(BaseModel):
    dependencies: List[DependencyConfig]
    dev_dependencies: List[DependencyConfig] = Field(alias="devDependencies")

    class Config:
        populate_by_name = True