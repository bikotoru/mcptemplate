"""
Generador principal CRUD para Next.js (Python MCP version)
Procesa templates y genera código completo
"""

import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
import glob

try:
    from .model_types import (
        CRUDGeneratorConfig, GenerationResult, GeneratorOptions,
        TemplateContext, GeneratedFile, FieldType
    )
    from .utils import StringUtils, FileUtils, Logger, TemplateUtils
    from .validators import CRUDValidator
except ImportError:
    from model_types import (
        CRUDGeneratorConfig, GenerationResult, GeneratorOptions,
        TemplateContext, GeneratedFile, FieldType
    )
    from utils import StringUtils, FileUtils, Logger, TemplateUtils
    from validators import CRUDValidator


class CRUDGenerator:
    """Clase principal del generador CRUD"""
    
    def __init__(self, templates_path: Optional[str] = None):
        current_dir = Path(__file__).parent
        self.templates_path = templates_path or str(current_dir / "templates" / "crud")
        
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
        # Filtros para comparación
        self.jinja_env.filters['eq'] = lambda a, b: a == b
        self.jinja_env.filters['neq'] = lambda a, b: a != b
        
        # Filtros para transformaciones de string
        self.jinja_env.filters['capitalize'] = StringUtils.capitalize
        self.jinja_env.filters['lower'] = str.lower
        self.jinja_env.filters['upper'] = str.upper
        self.jinja_env.filters['camelCase'] = StringUtils.to_camel_case
        self.jinja_env.filters['kebabCase'] = StringUtils.to_kebab_case
        self.jinja_env.filters['snakeCase'] = StringUtils.to_snake_case
        
        # Filtros para arrays
        self.jinja_env.filters['includes'] = lambda array, value: value in array if isinstance(array, list) else False
        self.jinja_env.filters['some'] = lambda array, attr: any(getattr(item, attr, False) for item in array) if isinstance(array, list) else False
        
        # Filtros para JSON
        self.jinja_env.filters['json'] = lambda obj: str(obj)
        self.jinja_env.filters['tojson'] = lambda obj: str(obj)
        
        # Filtro para obtener tipo TypeScript
        self.jinja_env.filters['getTypeScriptType'] = self._get_typescript_type
        
        # Filtro para comentarios
        self.jinja_env.filters['comment'] = lambda text, style='//': '\n'.join(f"{style} {line}" for line in text.split('\n'))
        
        # Filtro para primer elemento
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
            'relation': 'any'  # Será sobrescrito por la configuración específica
        }
        return type_mapping.get(field_type, 'string')
    
    async def generate(self, config: CRUDGeneratorConfig, options: GeneratorOptions = None) -> GenerationResult:
        """Genera un módulo CRUD completo"""
        if options is None:
            options = GeneratorOptions()
        
        if options.verbose:
            Logger.set_verbose(True)
        
        try:
            Logger.info(f"Iniciando generación de CRUD para {config.entity_name}")
            
            # 1. Validar configuración
            if not options.skip_validation:
                Logger.step(1, 6, 'Validando configuración')
                validation = CRUDValidator.validate(config.model_dump(by_alias=True))
                
                if not validation.valid:
                    return GenerationResult(
                        success=False,
                        message='Configuración inválida',
                        files_created=[],
                        errors=[f"{e.field}: {e.message}" for e in validation.errors]
                    )
                
                for warning in validation.warnings:
                    Logger.warning(warning)
            
            # 2. Verificar permisos de escritura
            Logger.step(2, 6, 'Verificando permisos de directorio')
            path_validation = await CRUDValidator.validate_target_path(config.target_path)
            
            if not path_validation.valid:
                return GenerationResult(
                    success=False,
                    message='Error de permisos en directorio destino',
                    files_created=[],
                    errors=[e.message for e in path_validation.errors]
                )
            
            # 3. Crear contexto de template
            Logger.step(3, 6, 'Preparando contexto de templates')
            context = self._create_template_context(config)
            
            # 4. Buscar y procesar templates
            Logger.step(4, 6, 'Localizando templates')
            template_files = await self._find_template_files()
            
            if len(template_files) == 0:
                return GenerationResult(
                    success=False,
                    message='No se encontraron templates',
                    files_created=[],
                    errors=[f"Templates no encontrados en: {self.templates_path}"]
                )
            
            Logger.debug(f"Encontrados {len(template_files)} templates")
            
            # 5. Generar archivos
            Logger.step(5, 6, 'Generando archivos')
            generated_files = []
            errors = []
            
            for template_file in template_files:
                try:
                    generated = await self._process_template(
                        template_file,
                        context,
                        config.target_path,
                        options.overwrite,
                        options.dry_run
                    )
                    
                    if generated:
                        generated_files.append(generated)
                        Logger.debug(f"✓ {generated.path}")
                
                except Exception as e:
                    error_msg = f"Error procesando {template_file}: {str(e)}"
                    errors.append(error_msg)
                    Logger.error(error_msg)
            
            # 6. Crear archivo README
            Logger.step(6, 6, 'Creando documentación')
            readme_file = await self._generate_readme(context, config.target_path, options.dry_run)
            if readme_file:
                generated_files.append(readme_file)
            
            # Resultado final
            result = GenerationResult(
                success=len(errors) == 0,
                message=(
                    f"CRUD generado exitosamente para {config.entity_name} ({len(generated_files)} archivos)"
                    if len(errors) == 0 else
                    f"Generación completada con errores ({len(generated_files)} archivos creados, {len(errors)} errores)"
                ),
                files_created=[f.path for f in generated_files],
                errors=errors if errors else None
            )
            
            # Log de resultado
            if result.success:
                Logger.success(result.message)
                Logger.info('Archivos generados:')
                for file in generated_files:
                    Logger.info(f"  {file.type}: {file.path}")
            else:
                Logger.error(result.message)
            
            return result
        
        except Exception as e:
            Logger.error(f"Error fatal en generación: {str(e)}")
            
            return GenerationResult(
                success=False,
                message='Error fatal durante la generación',
                files_created=[],
                errors=[str(e)]
            )
    
    def _create_template_context(self, config: CRUDGeneratorConfig) -> TemplateContext:
        """Crea el contexto para los templates"""
        entity_name = StringUtils.to_pascal_case(config.entity_name)
        entity_name_plural = StringUtils.to_pascal_case(config.entity_name_plural)
        
        return TemplateContext(
            ENTITY_NAME=entity_name,
            ENTITY_NAME_LOWER=StringUtils.uncapitalize(entity_name),
            ENTITY_NAME_PLURAL=entity_name_plural,
            ENTITY_NAME_PLURAL_LOWER=StringUtils.uncapitalize(entity_name_plural),
            ENTITY_NAME_UPPER=entity_name.upper(),
            API_ENDPOINT=config.api_endpoint,
            FIELDS=config.fields,
            PERMISSIONS=config.permissions,
            RELATION_ENDPOINTS=config.relation_endpoints or {},
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
                Logger.debug(f"No se encontraron archivos con patrón {pattern}")
        
        return list(set(files))  # Eliminar duplicados
    
    async def _process_template(
        self,
        template_path: str,
        context: TemplateContext,
        target_base_path: str,
        overwrite: bool,
        dry_run: bool
    ) -> Optional[GeneratedFile]:
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
            
            # Verificar si el archivo ya existe
            if not overwrite and await FileUtils.exists(target_path):
                Logger.warning(f"Archivo ya existe: {target_path} (usar --overwrite para sobrescribir)")
                return None
            
            # Crear backup si existe y se va a sobrescribir
            if overwrite and await FileUtils.exists(target_path):
                backup_path = await FileUtils.create_backup(target_path)
                if backup_path:
                    Logger.debug(f"Backup creado: {backup_path}")
            
            # En modo dry-run, solo simular
            if dry_run:
                Logger.info(f"[DRY RUN] Se generaría: {target_path}")
                return GeneratedFile(
                    path=target_path,
                    type=self._get_file_type(target_path),
                    description=f"Template: {os.path.basename(template_path)}"
                )
            
            # Crear directorio si no existe
            await FileUtils.ensure_directory(os.path.dirname(target_path))
            
            # Escribir archivo
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(generated_content)
            
            return GeneratedFile(
                path=target_path,
                type=self._get_file_type(target_path),
                description=f"Generated from {os.path.basename(template_path)}"
            )
        
        except Exception as e:
            raise Exception(f"Error procesando template {template_path}: {str(e)}")
    
    def _process_filename(self, file_path: str, context: TemplateContext) -> str:
        """Procesa el nombre del archivo reemplazando variables"""
        processed_path = file_path
        
        # Reemplazar placeholders comunes en nombres de archivo
        replacements = {
            '[Entity]': context.ENTITY_NAME,
            '[entity]': context.ENTITY_NAME_LOWER,
            '[ENTITY]': context.ENTITY_NAME_UPPER,
            '[Entities]': context.ENTITY_NAME_PLURAL,
            '[entities]': context.ENTITY_NAME_PLURAL_LOWER,
            '[id]': '[id]'  # Preservar [id] para rutas dinámicas de Next.js
        }
        
        # Manejar casos especiales para páginas
        if '(pages)' in processed_path:
            # Convertir templates como create.page.tsx.template -> create/page.tsx
            if '.page.tsx.template' in processed_path:
                processed_path = processed_path.replace('.page.tsx.template', '/page.tsx.template')
                # Extraer el nombre antes de .page.tsx.template y usarlo como directorio
                parts = processed_path.split('/')
                for i, part in enumerate(parts):
                    if '/page.tsx.template' in part:
                        page_name = part.replace('/page.tsx.template', '')
                        parts[i] = f"{page_name}/page.tsx.template"
                        break
                processed_path = '/'.join(parts)
            
            # Convertir [id].page.tsx.template -> [id]/page.tsx.template  
            if '[id].page.tsx.template' in processed_path:
                processed_path = processed_path.replace('[id].page.tsx.template', '[id]/page.tsx.template')
            
            # Convertir [id].edit.page.tsx.template -> [id]/edit/page.tsx.template
            if '[id].edit.page.tsx.template' in processed_path:
                processed_path = processed_path.replace('[id].edit.page.tsx.template', '[id]/edit/page.tsx.template')
        
        for placeholder, replacement in replacements.items():
            processed_path = processed_path.replace(placeholder, replacement)
        
        return processed_path
    
    def _get_file_type(self, file_path: str) -> str:
        """Determina el tipo de archivo basado en su ruta"""
        if '/components/' in file_path:
            return 'component'
        if '/(pages)/' in file_path or '/pages/' in file_path:
            return 'page'
        if '/api/' in file_path:
            return 'api'
        if '/types/' in file_path:
            return 'type'
        if '/hooks/' in file_path:
            return 'hook'
        if '/validation/' in file_path:
            return 'validation'
        return 'other'
    
    async def _generate_readme(
        self,
        context: TemplateContext,
        target_path: str,
        dry_run: bool
    ) -> Optional[GeneratedFile]:
        """Genera archivo README con documentación"""
        readme_content = self._generate_readme_content(context)
        readme_path = os.path.join(target_path, 'README.md')
        
        if dry_run:
            Logger.info(f"[DRY RUN] Se generaría: {readme_path}")
            return GeneratedFile(
                path=readme_path,
                type='other',
                description='Documentation file'
            )
        
        try:
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            return GeneratedFile(
                path=readme_path,
                type='other',
                description='Generated documentation'
            )
        except Exception as e:
            Logger.error(f"Error generando README: {str(e)}")
            return None
    
    def _generate_readme_content(self, context: TemplateContext) -> str:
        """Genera el contenido del README"""
        timestamp = datetime.fromisoformat(context.TIMESTAMP.replace('Z', '+00:00'))
        
        permissions_text = '\n'.join([
            f"- {action.upper()}: {'✅ Enabled' if enabled else '❌ Disabled'}"
            for action, enabled in context.PERMISSIONS.model_dump().items()
        ])
        
        fields_text = '\n'.join([
            f"- **{field.label}** ({field.type.value}){' - Required' if field.required else ''}"
            for field in context.FIELDS
        ])
        
        field_capabilities_list = []
        for field in context.FIELDS:
            capabilities = [
                cap for cap, enabled in [
                    ('Searchable', field.searchable),
                    ('Sortable', field.sortable),
                    ('Filterable', field.filterable),
                    ('Show in List', field.show_in_list)
                ] if enabled
            ]
            cap_text = ', '.join(capabilities) or 'Display only'
            field_capabilities_list.append(f"- **{field.label}**: {cap_text}")
        field_capabilities_text = '\n'.join(field_capabilities_list)
        
        relation_count = len([f for f in context.FIELDS if f.type == FieldType.RELATION])
        
        return f"""# {context.ENTITY_NAME_PLURAL} CRUD Module

Generated automatically by MCP CRUD Generator on {timestamp.strftime('%Y-%m-%d %H:%M:%S')}

## Overview

This module provides complete CRUD (Create, Read, Update, Delete) functionality for {context.ENTITY_NAME_PLURAL} in a Next.js application.

## Generated Files

### Components
- `components/{context.ENTITY_NAME}List.tsx` - Main list component with filtering and pagination
- `components/{context.ENTITY_NAME}Form.tsx` - Form component for create/edit operations
- `components/{context.ENTITY_NAME}Table.tsx` - Table component with sorting and selection
- `components/{context.ENTITY_NAME}Filter.tsx` - Advanced filtering component
- `components/{context.ENTITY_NAME}Search.tsx` - Search component with suggestions

### Pages (App Router)
- `(pages)/{context.ENTITY_NAME_LOWER}/page.tsx` - Main listing page
- `(pages)/{context.ENTITY_NAME_LOWER}/create/page.tsx` - Creation page
- `(pages)/{context.ENTITY_NAME_LOWER}/[id]/page.tsx` - Detail page
- `(pages)/{context.ENTITY_NAME_LOWER}/[id]/edit/page.tsx` - Edit page

### API Routes (App Router)
- `api/route.ts` - GET (list) and POST (create) operations
- `api/[id]/route.ts` - GET (detail), PUT (update), and DELETE operations

### TypeScript Types
- `types/{context.ENTITY_NAME_LOWER}.ts` - All TypeScript interfaces and types

### Hooks
- `hooks/use{context.ENTITY_NAME}.ts` - React Query hooks for data management

### Validation
- `validation/{context.ENTITY_NAME_LOWER}.ts` - Zod validation schemas

## Features

### Permissions
{permissions_text}

### Fields
{fields_text}

### Field Capabilities
{field_capabilities_text}

## Usage

### Basic List
```tsx
import {{ {context.ENTITY_NAME}List }} from './components/{context.ENTITY_NAME}List';

function {context.ENTITY_NAME_PLURAL}Page() {{
  return <{context.ENTITY_NAME}List />;
}}
```

### Using Hooks
```tsx
import {{ use{context.ENTITY_NAME} }} from './hooks/use{context.ENTITY_NAME}';

function MyComponent() {{
  const {{ data, isLoading, create{context.ENTITY_NAME} }} = use{context.ENTITY_NAME}.useManager();
  
  // Your component logic
}}
```

### API Endpoints
- `GET /api/{context.ENTITY_NAME_LOWER}` - List {context.ENTITY_NAME_PLURAL_LOWER}
- `POST /api/{context.ENTITY_NAME_LOWER}` - Create {context.ENTITY_NAME_LOWER}
- `GET /api/{context.ENTITY_NAME_LOWER}/[id]` - Get {context.ENTITY_NAME_LOWER} by ID
- `PUT /api/{context.ENTITY_NAME_LOWER}/[id]` - Update {context.ENTITY_NAME_LOWER}
- `DELETE /api/{context.ENTITY_NAME_LOWER}/[id]` - Delete {context.ENTITY_NAME_LOWER}

## Required Dependencies

Make sure these dependencies are installed in your Next.js project:

```json
{{
  "@tanstack/react-query": "^5.0.0",
  "@tanstack/react-table": "^8.0.0",
  "react-hook-form": "^7.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.22.0",
  "date-fns": "^2.30.0",
  "@heroicons/react": "^2.0.0"
}}
```

## Setup

1. Install the required dependencies
2. Set up your database connection in the API routes
3. Configure authentication if needed
4. Update the UI components to match your design system

## Customization

The generated code is fully customizable. You can:

- Modify components to match your design system
- Add custom validation rules
- Extend API functionality
- Add additional fields or features

## Notes

- This module was generated with permissions: {context.PERMISSIONS.model_dump()}
- API endpoint base: `{context.API_ENDPOINT}`
- Generated with {len(context.FIELDS)} fields
- Supports {relation_count} relationship(s)

---

Generated by MCP CRUD Generator v{context.VERSION}
"""
    
    async def validate_templates_path(self) -> bool:
        """Verifica la disponibilidad de templates"""
        try:
            exists = await FileUtils.exists(self.templates_path)
            if not exists:
                Logger.error(f"Directorio de templates no encontrado: {self.templates_path}")
                return False
            
            templates = await self._find_template_files()
            if len(templates) == 0:
                Logger.error(f"No se encontraron templates en: {self.templates_path}")
                return False
            
            Logger.debug(f"Templates válidos encontrados: {len(templates)}")
            return True
        except Exception as e:
            Logger.error(f"Error validando templates: {str(e)}")
            return False