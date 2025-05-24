/**
 * Validadores para la configuración del generador CRUD
 */

import { z } from 'zod';
import { ValidationUtils } from '../utils/index.js';
import type { 
  CRUDGeneratorConfig, 
  EntityField, 
  FieldValidation,
  FieldRelation,
  CRUDPermissions,
  ValidationResult,
  ValidationError 
} from '../types/index.js';

// Schema para validación de campo
const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  options: z.array(z.string()).optional(),
  accept: z.string().optional()
}).optional();

// Schema para relaciones
const fieldRelationSchema = z.object({
  endpoint: z.string().refine(
    (endpoint) => ValidationUtils.isValidApiEndpoint(endpoint),
    { message: "El endpoint de relación debe ser una ruta de API válida (ej: /api/marcas)" }
  ),
  displayField: z.string().min(1, "displayField es requerido"),
  valueField: z.string().min(1, "valueField es requerido"),
  searchFields: z.array(z.string().min(1)).min(1, "Debe tener al menos un campo de búsqueda"),
  multiple: z.boolean(),
  preload: z.boolean(),
  minChars: z.number().min(0).max(10),
  relationEntity: z.string().min(1, "relationEntity es requerido"),
  allowCreate: z.boolean()
}).optional();

// Schema para campos de entidad
const entityFieldSchema = z.object({
  name: z.string().refine(
    (name) => ValidationUtils.isValidFieldName(name),
    { message: "El nombre del campo debe ser un identificador válido (camelCase)" }
  ),
  type: z.enum([
    'text', 'number', 'email', 'password', 'select', 
    'textarea', 'date', 'boolean', 'file', 'relation'
  ]),
  label: z.string().min(1, "La etiqueta es requerida"),
  required: z.boolean(),
  validation: fieldValidationSchema,
  relation: fieldRelationSchema,
  searchable: z.boolean(),
  sortable: z.boolean(),
  filterable: z.boolean(),
  showInList: z.boolean(),
  placeholder: z.string().optional()
}).superRefine((field, ctx) => {
  // Validaciones específicas por tipo de campo
  if (field.type === 'relation' && !field.relation) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relation'],
      message: "Los campos de tipo 'relation' requieren configuración de relación"
    });
  }

  if (field.type === 'select' && (!field.validation?.options || field.validation.options.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validation', 'options'],
      message: "Los campos de tipo 'select' requieren opciones"
    });
  }

  if (field.type === 'file' && !field.validation?.accept) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validation', 'accept'],
      message: "Los campos de tipo 'file' requieren especificar tipos de archivo aceptados"
    });
  }

  // Validar que min <= max
  if (field.validation?.min && field.validation?.max && field.validation.min > field.validation.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validation'],
      message: "El valor mínimo no puede ser mayor que el máximo"
    });
  }
});

// Schema para permisos CRUD
const crudPermissionsSchema = z.object({
  create: z.boolean(),
  read: z.boolean(),
  update: z.boolean(),
  delete: z.boolean()
});

// Schema principal para la configuración del generador
const crudGeneratorConfigSchema = z.object({
  targetPath: z.string().min(1, "targetPath es requerido").refine(
    (path) => ValidationUtils.isValidPath(path),
    { message: "targetPath contiene caracteres no válidos" }
  ),
  entityName: z.string().min(1, "entityName es requerido").refine(
    (name) => ValidationUtils.isValidEntityName(name),
    { message: "entityName debe ser un identificador válido (PascalCase)" }
  ),
  entityNamePlural: z.string().min(1, "entityNamePlural es requerido").refine(
    (name) => ValidationUtils.isValidEntityName(name),
    { message: "entityNamePlural debe ser un identificador válido (PascalCase)" }
  ),
  fields: z.array(entityFieldSchema).min(1, "Debe tener al menos un campo"),
  apiEndpoint: z.string().refine(
    (endpoint) => ValidationUtils.isValidApiEndpoint(endpoint),
    { message: "apiEndpoint debe ser una ruta de API válida (ej: /api/productos)" }
  ),
  relationEndpoints: z.record(z.string()).optional(),
  permissions: crudPermissionsSchema
}).superRefine((config, ctx) => {
  // Validar que no haya campos duplicados
  const fieldNames = config.fields.map(f => f.name);
  const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
  
  if (duplicates.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fields'],
      message: `Nombres de campo duplicados: ${duplicates.join(', ')}`
    });
  }

  // Validar que al menos un campo sea mostrado en lista
  const fieldsInList = config.fields.filter(f => f.showInList);
  if (fieldsInList.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fields'],
      message: "Al menos un campo debe ser mostrado en la lista (showInList: true)"
    });
  }

  // Validar que existan endpoints para todas las relaciones
  const relationFields = config.fields.filter(f => f.type === 'relation');
  for (const field of relationFields) {
    if (field.relation && config.relationEndpoints) {
      const hasEndpoint = config.relationEndpoints[field.name] || field.relation.endpoint;
      if (!hasEndpoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relationEndpoints'],
          message: `Falta endpoint para el campo de relación '${field.name}'`
        });
      }
    }
  }

  // Validar que al menos un permiso esté habilitado
  const hasAnyPermission = Object.values(config.permissions).some(p => p);
  if (!hasAnyPermission) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['permissions'],
      message: "Al menos un permiso debe estar habilitado"
    });
  }
});

/**
 * Clase principal para validación de configuraciones
 */
export class CRUDValidator {
  /**
   * Valida una configuración completa del generador CRUD
   */
  static validate(config: unknown): ValidationResult {
    try {
      crudGeneratorConfigSchema.parse(config);
      return {
        valid: true,
        errors: [],
        warnings: this.generateWarnings(config as CRUDGeneratorConfig)
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }));

        return {
          valid: false,
          errors,
          warnings: []
        };
      }

      return {
        valid: false,
        errors: [{
          field: 'unknown',
          message: 'Error de validación desconocido',
          code: 'unknown_error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Genera advertencias para configuraciones válidas pero potencialmente problemáticas
   */
  private static generateWarnings(config: CRUDGeneratorConfig): string[] {
    const warnings: string[] = [];

    // Advertir si hay muchos campos en la lista
    const fieldsInList = config.fields.filter(f => f.showInList);
    if (fieldsInList.length > 8) {
      warnings.push(`Se mostrarán ${fieldsInList.length} campos en la tabla. Considera reducir el número para mejor UX.`);
    }

    // Advertir si no hay campos de búsqueda
    const searchableFields = config.fields.filter(f => f.searchable);
    if (searchableFields.length === 0) {
      warnings.push('No hay campos marcados como "searchable". Los usuarios no podrán buscar registros.');
    }

    // Advertir si no hay campos ordenables
    const sortableFields = config.fields.filter(f => f.sortable);
    if (sortableFields.length === 0) {
      warnings.push('No hay campos marcados como "sortable". Los usuarios no podrán ordenar los registros.');
    }

    // Advertir sobre relaciones con preload
    const preloadRelations = config.fields.filter(f => 
      f.type === 'relation' && f.relation?.preload
    );
    if (preloadRelations.length > 0) {
      warnings.push(`${preloadRelations.length} relación(es) tienen preload habilitado. Esto puede afectar el rendimiento si hay muchos registros.`);
    }

    // Advertir si entityNamePlural parece ser igual al singular
    if (config.entityName === config.entityNamePlural) {
      warnings.push('El nombre plural parece ser igual al singular. Verifica que sea correcto.');
    }

    // Advertir sobre campos obligatorios sin validación mínima
    const requiredWithoutMin = config.fields.filter(f => 
      f.required && 
      f.type === 'text' && 
      (!f.validation?.min || f.validation.min === 0)
    );
    if (requiredWithoutMin.length > 0) {
      warnings.push(`${requiredWithoutMin.length} campo(s) obligatorio(s) de texto no tienen validación mínima de caracteres.`);
    }

    return warnings;
  }

  /**
   * Valida solo la estructura de un campo
   */
  static validateField(field: unknown): ValidationResult {
    try {
      entityFieldSchema.parse(field);
      return { valid: true, errors: [], warnings: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }));

        return { valid: false, errors, warnings: [] };
      }

      return {
        valid: false,
        errors: [{
          field: 'unknown',
          message: 'Error de validación desconocido',
          code: 'unknown_error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Valida que un path de destino sea escribible
   */
  static async validateTargetPath(targetPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      // Verificar que el path sea válido
      if (!ValidationUtils.isValidPath(targetPath)) {
        errors.push({
          field: 'targetPath',
          message: 'El path contiene caracteres no válidos',
          code: 'invalid_path'
        });
      }

      // Verificar que se pueda escribir en el directorio
      const { FileUtils } = await import('../utils/index.js');
      const canWrite = await FileUtils.canWriteToDirectory(targetPath);
      
      if (!canWrite) {
        errors.push({
          field: 'targetPath',
          message: 'No se puede escribir en el directorio especificado',
          code: 'permission_denied'
        });
      }

    } catch (error) {
      errors.push({
        field: 'targetPath',
        message: 'Error al validar el directorio de destino',
        code: 'filesystem_error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Valida las dependencias requeridas en un proyecto Next.js
   */
  static async validateProjectDependencies(
    projectPath: string,
    requiredDeps: string[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      const { DependencyUtils } = await import('../utils/index.js');
      
      const hasPackageJson = await DependencyUtils.hasPackageJson(projectPath);
      if (!hasPackageJson) {
        errors.push({
          field: 'projectPath',
          message: 'No se encontró package.json en el directorio del proyecto',
          code: 'missing_package_json'
        });
        return { valid: false, errors, warnings };
      }

      const { missing, present } = await DependencyUtils.checkRequiredDependencies(
        projectPath,
        requiredDeps
      );

      if (missing.length > 0) {
        warnings.push(`Dependencias faltantes: ${missing.join(', ')}. Se recomienda instalarlas para el correcto funcionamiento.`);
      }

      if (present.length > 0) {
        warnings.push(`Dependencias encontradas: ${present.join(', ')}.`);
      }

    } catch (error) {
      errors.push({
        field: 'projectPath',
        message: 'Error al validar las dependencias del proyecto',
        code: 'dependency_check_error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Helpers para validación específica de tipos de campo
 */
export class FieldValidators {
  /**
   * Valida configuración específica para campos de tipo relation
   */
  static validateRelationField(field: EntityField): ValidationError[] {
    const errors: ValidationError[] = [];

    if (field.type !== 'relation') return errors;

    if (!field.relation) {
      errors.push({
        field: 'relation',
        message: 'Los campos de tipo relation requieren configuración de relación',
        code: 'missing_relation_config'
      });
      return errors;
    }

    // Validar que minChars sea razonable
    if (field.relation.minChars > 5) {
      errors.push({
        field: 'relation.minChars',
        message: 'minChars no debería ser mayor a 5 para mejor UX',
        code: 'high_min_chars'
      });
    }

    // Validar que los campos de búsqueda no estén vacíos
    if (field.relation.searchFields.length === 0) {
      errors.push({
        field: 'relation.searchFields',
        message: 'Debe especificar al menos un campo de búsqueda',
        code: 'empty_search_fields'
      });
    }

    return errors;
  }

  /**
   * Valida configuración específica para campos de tipo select
   */
  static validateSelectField(field: EntityField): ValidationError[] {
    const errors: ValidationError[] = [];

    if (field.type !== 'select') return errors;

    if (!field.validation?.options || field.validation.options.length === 0) {
      errors.push({
        field: 'validation.options',
        message: 'Los campos de tipo select requieren opciones',
        code: 'missing_select_options'
      });
    }

    return errors;
  }

  /**
   * Valida configuración específica para campos de tipo file
   */
  static validateFileField(field: EntityField): ValidationError[] {
    const errors: ValidationError[] = [];

    if (field.type !== 'file') return errors;

    if (!field.validation?.accept) {
      errors.push({
        field: 'validation.accept',
        message: 'Los campos de tipo file requieren especificar tipos de archivo aceptados',
        code: 'missing_file_accept'
      });
    }

    return errors;
  }
}

export { crudGeneratorConfigSchema };
