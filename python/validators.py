"""
Validadores para la configuración del generador CRUD (Python MCP version)
"""

from typing import List, Dict, Any, Optional
from pydantic import ValidationError as PydanticValidationError
try:
    from .model_types import (
        CRUDGeneratorConfig, EntityField, FieldValidation, 
        FieldRelation, CRUDPermissions, ValidationResult,
        ValidationError, FieldType
    )
    from .utils import ValidationUtils, FileUtils, DependencyUtils
except ImportError:
    from model_types import (
        CRUDGeneratorConfig, EntityField, FieldValidation, 
        FieldRelation, CRUDPermissions, ValidationResult,
        ValidationError, FieldType
    )
    from utils import ValidationUtils, FileUtils, DependencyUtils


class CRUDValidator:
    """Clase principal para validación de configuraciones"""
    
    @staticmethod
    def validate(config_data: Dict[str, Any]) -> ValidationResult:
        """Valida una configuración completa del generador CRUD"""
        try:
            config = CRUDGeneratorConfig.model_validate(config_data)
            return ValidationResult(
                valid=True,
                errors=[],
                warnings=CRUDValidator._generate_warnings(config)
            )
        except PydanticValidationError as e:
            errors = []
            for error in e.errors():
                field_path = '.'.join(str(x) for x in error['loc'])
                errors.append(ValidationError(
                    field=field_path,
                    message=error['msg'],
                    code=error['type']
                ))
            
            return ValidationResult(
                valid=False,
                errors=errors,
                warnings=[]
            )
        except Exception as e:
            return ValidationResult(
                valid=False,
                errors=[ValidationError(
                    field='unknown',
                    message='Error de validación desconocido',
                    code='unknown_error'
                )],
                warnings=[]
            )
    
    @staticmethod
    def _generate_warnings(config: CRUDGeneratorConfig) -> List[str]:
        """Genera advertencias para configuraciones válidas pero potencialmente problemáticas"""
        warnings = []
        
        # Advertir si hay muchos campos en la lista
        fields_in_list = [f for f in config.fields if f.show_in_list]
        if len(fields_in_list) > 8:
            warnings.append(f"Se mostrarán {len(fields_in_list)} campos en la tabla. Considera reducir el número para mejor UX.")
        
        # Advertir si no hay campos de búsqueda
        searchable_fields = [f for f in config.fields if f.searchable]
        if len(searchable_fields) == 0:
            warnings.append('No hay campos marcados como "searchable". Los usuarios no podrán buscar registros.')
        
        # Advertir si no hay campos ordenables
        sortable_fields = [f for f in config.fields if f.sortable]
        if len(sortable_fields) == 0:
            warnings.append('No hay campos marcados como "sortable". Los usuarios no podrán ordenar los registros.')
        
        # Advertir sobre relaciones con preload
        preload_relations = [f for f in config.fields 
                           if f.type == FieldType.RELATION and f.relation and f.relation.preload]
        if len(preload_relations) > 0:
            warnings.append(f"{len(preload_relations)} relación(es) tienen preload habilitado. Esto puede afectar el rendimiento si hay muchos registros.")
        
        # Advertir si entityNamePlural parece ser igual al singular
        if config.entity_name == config.entity_name_plural:
            warnings.append('El nombre plural parece ser igual al singular. Verifica que sea correcto.')
        
        # Advertir sobre campos obligatorios sin validación mínima
        required_without_min = [f for f in config.fields 
                              if f.required and f.type == FieldType.TEXT and 
                              (not f.validation or not f.validation.min or f.validation.min == 0)]
        if len(required_without_min) > 0:
            warnings.append(f"{len(required_without_min)} campo(s) obligatorio(s) de texto no tienen validación mínima de caracteres.")
        
        return warnings
    
    @staticmethod
    def validate_field(field_data: Dict[str, Any]) -> ValidationResult:
        """Valida solo la estructura de un campo"""
        try:
            EntityField.model_validate(field_data)
            return ValidationResult(valid=True, errors=[], warnings=[])
        except PydanticValidationError as e:
            errors = []
            for error in e.errors():
                field_path = '.'.join(str(x) for x in error['loc'])
                errors.append(ValidationError(
                    field=field_path,
                    message=error['msg'],
                    code=error['type']
                ))
            
            return ValidationResult(valid=False, errors=errors, warnings=[])
        except Exception:
            return ValidationResult(
                valid=False,
                errors=[ValidationError(
                    field='unknown',
                    message='Error de validación desconocido',
                    code='unknown_error'
                )],
                warnings=[]
            )
    
    @staticmethod
    async def validate_target_path(target_path: str) -> ValidationResult:
        """Valida que un path de destino sea escribible"""
        errors = []
        
        try:
            # Verificar que el path sea válido
            if not ValidationUtils.is_valid_path(target_path):
                errors.append(ValidationError(
                    field='targetPath',
                    message='El path contiene caracteres no válidos',
                    code='invalid_path'
                ))
            
            # Verificar que se pueda escribir en el directorio
            can_write = await FileUtils.can_write_to_directory(target_path)
            if not can_write:
                errors.append(ValidationError(
                    field='targetPath',
                    message='No se puede escribir en el directorio especificado',
                    code='permission_denied'
                ))
        
        except Exception:
            errors.append(ValidationError(
                field='targetPath',
                message='Error al validar el directorio de destino',
                code='filesystem_error'
            ))
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=[]
        )
    
    @staticmethod
    async def validate_project_dependencies(
        project_path: str,
        required_deps: List[str]
    ) -> ValidationResult:
        """Valida las dependencias requeridas en un proyecto Next.js"""
        errors = []
        warnings = []
        
        try:
            has_package_json = await DependencyUtils.has_package_json(project_path)
            if not has_package_json:
                errors.append(ValidationError(
                    field='projectPath',
                    message='No se encontró package.json en el directorio del proyecto',
                    code='missing_package_json'
                ))
                return ValidationResult(valid=False, errors=errors, warnings=warnings)
            
            missing, present = await DependencyUtils.check_required_dependencies(
                project_path, required_deps
            )
            
            if missing:
                warnings.append(f"Dependencias faltantes: {', '.join(missing)}. Se recomienda instalarlas para el correcto funcionamiento.")
            
            if present:
                warnings.append(f"Dependencias encontradas: {', '.join(present)}.")
        
        except Exception:
            errors.append(ValidationError(
                field='projectPath',
                message='Error al validar las dependencias del proyecto',
                code='dependency_check_error'
            ))
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )


class FieldValidators:
    """Helpers para validación específica de tipos de campo"""
    
    @staticmethod
    def validate_relation_field(field: EntityField) -> List[ValidationError]:
        """Valida configuración específica para campos de tipo relation"""
        errors = []
        
        if field.type != FieldType.RELATION:
            return errors
        
        if not field.relation:
            errors.append(ValidationError(
                field='relation',
                message='Los campos de tipo relation requieren configuración de relación',
                code='missing_relation_config'
            ))
            return errors
        
        # Validar que minChars sea razonable
        if field.relation.min_chars > 5:
            errors.append(ValidationError(
                field='relation.minChars',
                message='minChars no debería ser mayor a 5 para mejor UX',
                code='high_min_chars'
            ))
        
        # Validar que los campos de búsqueda no estén vacíos
        if len(field.relation.search_fields) == 0:
            errors.append(ValidationError(
                field='relation.searchFields',
                message='Debe especificar al menos un campo de búsqueda',
                code='empty_search_fields'
            ))
        
        return errors
    
    @staticmethod
    def validate_select_field(field: EntityField) -> List[ValidationError]:
        """Valida configuración específica para campos de tipo select"""
        errors = []
        
        if field.type != FieldType.SELECT:
            return errors
        
        if not field.validation or not field.validation.options or len(field.validation.options) == 0:
            errors.append(ValidationError(
                field='validation.options',
                message='Los campos de tipo select requieren opciones',
                code='missing_select_options'
            ))
        
        return errors
    
    @staticmethod
    def validate_file_field(field: EntityField) -> List[ValidationError]:
        """Valida configuración específica para campos de tipo file"""
        errors = []
        
        if field.type != FieldType.FILE:
            return errors
        
        if not field.validation or not field.validation.accept:
            errors.append(ValidationError(
                field='validation.accept',
                message='Los campos de tipo file requieren especificar tipos de archivo aceptados',
                code='missing_file_accept'
            ))
        
        return errors