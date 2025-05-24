"""
Generador CRUD adaptado para FastAPI
Basado en la lógica existente del python/generators.py
"""

import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
import glob
from pydantic import BaseModel

class GenerationResult(BaseModel):
    success: bool
    message: str
    files_created: List[str] = []
    errors: Optional[List[str]] = None

class TemplateContext(BaseModel):
    ENTITY_NAME: str
    ENTITY_NAME_LOWER: str
    ENTITY_NAME_PLURAL: str
    ENTITY_NAME_PLURAL_LOWER: str
    ENTITY_NAME_UPPER: str
    API_ENDPOINT: str
    FIELDS: List[Dict[str, Any]]
    PERMISSIONS: Dict[str, bool]
    RELATION_ENDPOINTS: Dict[str, str]
    TIMESTAMP: str
    VERSION: str

class StringUtils:
    @staticmethod
    def to_pascal_case(text: str) -> str:
        return ''.join(word.capitalize() for word in text.replace('_', ' ').replace('-', ' ').split())
    
    @staticmethod
    def to_camel_case(text: str) -> str:
        pascal = StringUtils.to_pascal_case(text)
        return pascal[0].lower() + pascal[1:] if pascal else text
    
    @staticmethod
    def to_kebab_case(text: str) -> str:
        return text.replace('_', '-').replace(' ', '-').lower()
    
    @staticmethod
    def to_snake_case(text: str) -> str:
        return text.replace('-', '_').replace(' ', '_').lower()
    
    @staticmethod
    def uncapitalize(text: str) -> str:
        return text[0].lower() + text[1:] if text else text
    
    @staticmethod
    def capitalize(text: str) -> str:
        return text[0].upper() + text[1:] if text else text

class FileUtils:
    @staticmethod
    async def exists(path: str) -> bool:
        return os.path.exists(path)
    
    @staticmethod
    async def ensure_directory(path: str) -> None:
        os.makedirs(path, exist_ok=True)
    
    @staticmethod
    async def find_files(pattern: str, base_path: str) -> List[str]:
        full_pattern = os.path.join(base_path, pattern)
        return glob.glob(full_pattern, recursive=True)

class CRUDGenerator:
    """Generador CRUD simplificado para FastAPI"""
    
    def __init__(self, templates_path: Optional[str] = None):
        current_dir = Path(__file__).parent.parent.parent
        self.templates_path = templates_path or str(current_dir / "src" / "templates" / "crud")
        
        # Configurar Jinja2
        self.jinja_env = Environment(
            loader=FileSystemLoader(self.templates_path),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        self._register_filters()
    
    def _register_filters(self) -> None:
        """Registra filtros personalizados para Jinja2"""
        self.jinja_env.filters['eq'] = lambda a, b: a == b
        self.jinja_env.filters['neq'] = lambda a, b: a != b
        self.jinja_env.filters['capitalize'] = StringUtils.capitalize
        self.jinja_env.filters['lower'] = str.lower
        self.jinja_env.filters['upper'] = str.upper
        self.jinja_env.filters['camelCase'] = StringUtils.to_camel_case
        self.jinja_env.filters['kebabCase'] = StringUtils.to_kebab_case
        self.jinja_env.filters['snakeCase'] = StringUtils.to_snake_case
        self.jinja_env.filters['includes'] = lambda array, value: value in array if isinstance(array, list) else False
        self.jinja_env.filters['some'] = lambda array, attr: any(getattr(item, attr, False) for item in array) if isinstance(array, list) else False
        self.jinja_env.filters['json'] = lambda obj: str(obj)
        self.jinja_env.filters['tojson'] = lambda obj: str(obj)
        self.jinja_env.filters['getTypeScriptType'] = self._get_typescript_type
        self.jinja_env.filters['comment'] = lambda text, style='//': '\n'.join(f"{style} {line}" for line in text.split('\n'))
        self.jinja_env.filters['first'] = lambda array: array[0] if isinstance(array, list) and array else ''
    
    def _get_typescript_type(self, field_type: str) -> str:
        """Obtiene tipo TypeScript desde tipo de campo"""
        type_mapping = {
            'text': 'string',
            'email': 'string',
            'password': 'string',
            'textarea': 'string',
            'select': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'date': 'Date',
            'file': 'string',
            'relation': 'any'
        }
        return type_mapping.get(field_type, 'string')
    
    async def generate(self, entity_name: str, fields: Dict[str, Any], output_path: str = None) -> GenerationResult:
        """Genera un módulo CRUD completo"""
        try:
            # Crear contexto
            context = self._create_template_context(entity_name, fields)
            
            # Buscar templates
            template_files = await self._find_template_files()
            
            if len(template_files) == 0:
                return GenerationResult(
                    success=False,
                    message='No se encontraron templates',
                    files_created=[],
                    errors=[f"Templates no encontrados en: {self.templates_path}"]
                )
            
            # Generar archivos
            generated_files = []
            errors = []
            
            target_path = output_path or f"./generated/{entity_name.lower()}"
            
            for template_file in template_files:
                try:
                    generated = await self._process_template(
                        template_file,
                        context,
                        target_path
                    )
                    
                    if generated:
                        generated_files.append(generated)
                
                except Exception as e:
                    error_msg = f"Error procesando {template_file}: {str(e)}"
                    errors.append(error_msg)
            
            # Resultado final
            return GenerationResult(
                success=len(errors) == 0,
                message=(
                    f"CRUD generado exitosamente para {entity_name} ({len(generated_files)} archivos)"
                    if len(errors) == 0 else
                    f"Generación completada con errores ({len(generated_files)} archivos, {len(errors)} errores)"
                ),
                files_created=generated_files,
                errors=errors if errors else None
            )
        
        except Exception as e:
            return GenerationResult(
                success=False,
                message='Error fatal durante la generación',
                files_created=[],
                errors=[str(e)]
            )
    
    def _create_template_context(self, entity_name: str, fields: Dict[str, Any]) -> TemplateContext:
        """Crea el contexto para los templates"""
        entity_name_pascal = StringUtils.to_pascal_case(entity_name)
        entity_name_plural = f"{entity_name_pascal}s"  # Simplificado
        
        return TemplateContext(
            ENTITY_NAME=entity_name_pascal,
            ENTITY_NAME_LOWER=StringUtils.uncapitalize(entity_name_pascal),
            ENTITY_NAME_PLURAL=entity_name_plural,
            ENTITY_NAME_PLURAL_LOWER=StringUtils.uncapitalize(entity_name_plural),
            ENTITY_NAME_UPPER=entity_name_pascal.upper(),
            API_ENDPOINT=f"/api/{entity_name.lower()}s",
            FIELDS=fields.get('fields', []),
            PERMISSIONS={
                "create": True,
                "read": True,
                "update": True,
                "delete": True
            },
            RELATION_ENDPOINTS={},
            TIMESTAMP=datetime.now().isoformat(),
            VERSION='1.0.0'
        )
    
    async def _find_template_files(self) -> List[str]:
        """Busca todos los archivos de template"""
        patterns = [
            '**/*.template',
            '**/*.tsx.template',
            '**/*.ts.template',
            '**/*.js.template'
        ]
        
        files = []
        
        for pattern in patterns:
            try:
                found_files = await FileUtils.find_files(pattern, self.templates_path)
                files.extend(found_files)
            except Exception:
                pass
        
        return list(set(files))
    
    async def _process_template(
        self,
        template_path: str,
        context: TemplateContext,
        target_base_path: str
    ) -> Optional[str]:
        """Procesa un archivo de template individual"""
        try:
            # Leer contenido del template
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            # Compilar template con Jinja2
            template = self.jinja_env.from_string(template_content)
            generated_content = template.render(context.model_dump())
            
            # Determinar ruta de destino
            relative_path = os.path.relpath(template_path, self.templates_path)
            target_path = os.path.join(target_base_path, relative_path)
            
            # Reemplazar variables en el nombre del archivo
            target_path = self._process_filename(target_path, context)
            
            # Remover extensión .template
            target_path = target_path.replace('.template', '')
            
            # Crear directorio si no existe
            await FileUtils.ensure_directory(os.path.dirname(target_path))
            
            # Escribir archivo
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(generated_content)
            
            return target_path
        
        except Exception as e:
            raise Exception(f"Error procesando template {template_path}: {str(e)}")
    
    def _process_filename(self, file_path: str, context: TemplateContext) -> str:
        """Procesa el nombre del archivo reemplazando variables"""
        processed_path = file_path
        
        replacements = {
            '[Entity]': context.ENTITY_NAME,
            '[entity]': context.ENTITY_NAME_LOWER,
            '[ENTITY]': context.ENTITY_NAME_UPPER,
            '[Entities]': context.ENTITY_NAME_PLURAL,
            '[entities]': context.ENTITY_NAME_PLURAL_LOWER,
            '[id]': '[id]'
        }
        
        # Manejar casos especiales para páginas
        if '(pages)' in processed_path:
            if '.page.tsx.template' in processed_path:
                processed_path = processed_path.replace('.page.tsx.template', '/page.tsx.template')
                parts = processed_path.split('/')
                for i, part in enumerate(parts):
                    if '/page.tsx.template' in part:
                        page_name = part.replace('/page.tsx.template', '')
                        parts[i] = f"{page_name}/page.tsx.template"
                        break
                processed_path = '/'.join(parts)
            
            if '[id].page.tsx.template' in processed_path:
                processed_path = processed_path.replace('[id].page.tsx.template', '[id]/page.tsx.template')
            
            if '[id].edit.page.tsx.template' in processed_path:
                processed_path = processed_path.replace('[id].edit.page.tsx.template', '[id]/edit/page.tsx.template')
        
        for placeholder, replacement in replacements.items():
            processed_path = processed_path.replace(placeholder, replacement)
        
        return processed_path
    
    async def validate_templates_path(self) -> bool:
        """Verifica la disponibilidad de templates"""
        try:
            exists = await FileUtils.exists(self.templates_path)
            if not exists:
                return False
            
            templates = await self._find_template_files()
            return len(templates) > 0
        except Exception:
            return False