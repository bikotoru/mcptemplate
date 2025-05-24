"""
Utilidades para el generador CRUD (migradas desde TypeScript)
"""

import re
import os
import json
import shutil
import glob
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import sys

class StringUtils:
    """Convierte un string a diferentes formatos de nomenclatura"""
    
    @staticmethod
    def to_pascal_case(s: str) -> str:
        """Convierte a PascalCase (ej: "mi entidad" -> "MiEntidad")"""
        return ''.join(word.capitalize() for word in re.split(r'[\s_-]+', s) if word)
    
    @staticmethod
    def to_camel_case(s: str) -> str:
        """Convierte a camelCase (ej: "mi entidad" -> "miEntidad")"""
        pascal = StringUtils.to_pascal_case(s)
        return pascal[0].lower() + pascal[1:] if pascal else ""
    
    @staticmethod
    def to_kebab_case(s: str) -> str:
        """Convierte a kebab-case (ej: "mi entidad" -> "mi-entidad")"""
        # Primero maneja camelCase/PascalCase
        s = re.sub(r'([a-z])([A-Z])', r'\1-\2', s)
        # Luego reemplaza espacios y otros separadores
        s = re.sub(r'[\s_]+', '-', s)
        return s.lower()
    
    @staticmethod
    def to_snake_case(s: str) -> str:
        """Convierte a snake_case (ej: "mi entidad" -> "mi_entidad")"""
        # Primero maneja camelCase/PascalCase
        s = re.sub(r'([a-z])([A-Z])', r'\1_\2', s)
        # Luego reemplaza espacios y otros separadores
        s = re.sub(r'[\s-]+', '_', s)
        return s.lower()
    
    @staticmethod
    def pluralize(s: str) -> str:
        """Pluraliza un nombre simple (implementación básica)"""
        if s.endswith('s'):
            return s
        if s.endswith('y'):
            return s[:-1] + 'ies'
        if s.endswith(('ch', 'sh', 'x', 'z')):
            return s + 'es'
        return s + 's'
    
    @staticmethod
    def capitalize(s: str) -> str:
        """Capitaliza la primera letra"""
        return s[0].upper() + s[1:] if s else ""
    
    @staticmethod
    def uncapitalize(s: str) -> str:
        """Convierte la primera letra a minúscula"""
        return s[0].lower() + s[1:] if s else ""

class FileUtils:
    """Utilidades para manejo de archivos"""
    
    @staticmethod
    async def can_write_to_directory(dir_path: str) -> bool:
        """Verifica si un directorio existe y tiene permisos de escritura"""
        try:
            path = Path(dir_path)
            path.mkdir(parents=True, exist_ok=True)
            return os.access(path, os.W_OK)
        except:
            return False
    
    @staticmethod
    async def ensure_directory(dir_path: str) -> None:
        """Crea un directorio si no existe"""
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    async def copy_and_replace(
        source_path: str,
        target_path: str,
        replacements: Dict[str, str]
    ) -> None:
        """Copia un archivo y reemplaza variables en el contenido"""
        with open(source_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for key, value in replacements.items():
            content = content.replace(f"{{{{{key}}}}}", value)
        
        target = Path(target_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    @staticmethod
    async def find_files(pattern: str, cwd: Optional[str] = None) -> List[str]:
        """Lista todos los archivos en un directorio con un patrón específico"""
        if cwd:
            pattern = os.path.join(cwd, pattern)
        return glob.glob(pattern, recursive=True)
    
    @staticmethod
    async def read_json(file_path: str) -> Optional[Dict[str, Any]]:
        """Lee un archivo JSON de forma segura"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return None
    
    @staticmethod
    async def write_json(file_path: str, data: Any, indent: int = 2) -> None:
        """Escribe un archivo JSON con formato"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)
    
    @staticmethod
    async def exists(file_path: str) -> bool:
        """Verifica si un archivo existe"""
        return Path(file_path).exists()
    
    @staticmethod
    async def get_file_size(file_path: str) -> int:
        """Obtiene el tamaño de un archivo en bytes"""
        return Path(file_path).stat().st_size
    
    @staticmethod
    async def create_backup(file_path: str) -> Optional[str]:
        """Crea un backup de un archivo si existe"""
        path = Path(file_path)
        if not path.exists():
            return None
        
        timestamp = datetime.now().isoformat().replace(':', '-').replace('.', '-')
        backup_path = f"{file_path}.backup.{timestamp}"
        
        shutil.copy2(file_path, backup_path)
        return backup_path

class Logger:
    """Utilidades para logging con colores"""
    
    verbose = False
    enabled = True
    
    @classmethod
    def set_verbose(cls, verbose: bool) -> None:
        cls.verbose = verbose
    
    @classmethod
    def set_enabled(cls, enabled: bool) -> None:
        cls.enabled = enabled
    
    @classmethod
    def info(cls, message: str, *args) -> None:
        if not cls.enabled:
            return
        print(f"ℹ {message}", *args, file=sys.stderr)
    
    @classmethod
    def success(cls, message: str) -> None:
        if not cls.enabled:
            return
        print(f"✓ {message}", file=sys.stderr)
    
    @classmethod
    def warning(cls, message: str) -> None:
        if not cls.enabled:
            return
        print(f"⚠ {message}", file=sys.stderr)
    
    @classmethod
    def error(cls, message: str) -> None:
        if not cls.enabled:
            return
        print(f"✗ {message}", file=sys.stderr)
    
    @classmethod
    def debug(cls, message: str) -> None:
        if not cls.enabled or not cls.verbose:
            return
        print(f"🐛 {message}", file=sys.stderr)
    
    @classmethod
    def progress(cls, message: str) -> None:
        if not cls.enabled:
            return
        print(f"⚡ {message}", file=sys.stderr)
    
    @classmethod
    def step(cls, step: int, total: int, message: str) -> None:
        if not cls.enabled:
            return
        print(f"[{step}/{total}] {message}", file=sys.stderr)

class ValidationUtils:
    """Utilidades para validación"""
    
    @staticmethod
    def is_valid_entity_name(name: str) -> bool:
        """Valida que un nombre de entidad sea válido"""
        return re.match(r'^[A-Za-z][A-Za-z0-9]*$', name) is not None
    
    @staticmethod
    def is_valid_path(path: str) -> bool:
        """Valida que un path sea válido y seguro"""
        try:
            # Verifica que no contenga caracteres peligrosos
            if '..' in path or '<' in path or '>' in path:
                return False
            return True
        except:
            return False
    
    @staticmethod
    def is_valid_api_endpoint(endpoint: str) -> bool:
        """Valida que un endpoint de API sea válido"""
        return re.match(r'^/api/[a-z0-9\-_/]+$', endpoint) is not None
    
    @staticmethod
    def is_valid_field_name(name: str) -> bool:
        """Valida que un nombre de campo sea válido"""
        return re.match(r'^[a-z][a-zA-Z0-9]*$', name) is not None

class DependencyUtils:
    """Utilidades para manejo de dependencias"""
    
    @staticmethod
    async def has_package_json(project_path: str) -> bool:
        """Verifica si un package.json existe en el directorio"""
        package_path = os.path.join(project_path, 'package.json')
        return await FileUtils.exists(package_path)
    
    @staticmethod
    async def get_project_dependencies(project_path: str) -> Dict[str, str]:
        """Lee las dependencias actuales del proyecto"""
        package_path = os.path.join(project_path, 'package.json')
        package_json = await FileUtils.read_json(package_path)
        
        if not package_json or not isinstance(package_json, dict):
            return {}
        
        dependencies = {}
        dependencies.update(package_json.get('dependencies', {}))
        dependencies.update(package_json.get('devDependencies', {}))
        
        return dependencies
    
    @staticmethod
    async def check_required_dependencies(
        project_path: str,
        required: List[str]
    ) -> Tuple[List[str], List[str]]:
        """Verifica si las dependencias requeridas están instaladas"""
        dependencies = await DependencyUtils.get_project_dependencies(project_path)
        missing = []
        present = []
        
        for dep in required:
            if dep in dependencies:
                present.append(dep)
            else:
                missing.append(dep)
        
        return missing, present

class TemplateUtils:
    """Utilidades para procesamiento de templates"""
    
    @staticmethod
    def escape_regex(s: str) -> str:
        """Escapa caracteres especiales para usar en regex"""
        return re.escape(s)
    
    @staticmethod
    def replace_variables(template: str, context: Dict[str, Any]) -> str:
        """Reemplaza variables en un template usando un objeto de contexto"""
        result = template
        
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
        
        return result
    
    @staticmethod
    def process_conditionals(template: str, context: Dict[str, Any]) -> str:
        """Procesa condicionales simples en templates"""
        # Procesa {{#if condition}} ... {{/if}}
        def replace_conditional(match):
            condition = match.group(1)
            content = match.group(2)
            return content if context.get(condition) else ''
        
        return re.sub(
            r'\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{/if\}\}',
            replace_conditional,
            template
        )
    
    @staticmethod
    def process_loops(template: str, context: Dict[str, Any]) -> str:
        """Procesa loops simples en templates"""
        # Procesa {{#each array}} ... {{/each}}
        def replace_loop(match):
            array_name = match.group(1)
            content = match.group(2)
            array = context.get(array_name)
            
            if not isinstance(array, list):
                return ''
            
            result = []
            for item in array:
                item_content = content
                
                # Reemplaza {{this}} con el item actual
                item_content = item_content.replace('{{this}}', str(item))
                
                # Si el item es un objeto, reemplaza {{prop}} con item.prop
                if isinstance(item, dict):
                    for key, value in item.items():
                        item_content = item_content.replace(f'{{{{{key}}}}}', str(value))
                
                result.append(item_content)
            
            return ''.join(result)
        
        return re.sub(
            r'\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{/each\}\}',
            replace_loop,
            template
        )