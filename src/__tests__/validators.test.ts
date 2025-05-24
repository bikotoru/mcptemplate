/**
 * Tests para validadores
 */

import { CRUDValidator, FieldValidators } from '../validators/index.js';
import type { CRUDGeneratorConfig, EntityField } from '../types/index.js';

describe('CRUDValidator', () => {
  const validConfig: CRUDGeneratorConfig = {
    targetPath: './src/modules/test',
    entityName: 'TestEntity',
    entityNamePlural: 'TestEntities',
    fields: [
      {
        name: 'nombre',
        type: 'text',
        label: 'Nombre',
        required: true,
        validation: { min: 2, max: 100 },
        searchable: true,
        sortable: true,
        filterable: true,
        showInList: true,
        placeholder: 'Ingrese nombre'
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        required: true,
        searchable: true,
        sortable: true,
        filterable: false,
        showInList: true
      }
    ],
    apiEndpoint: '/api/test-entities',
    permissions: {
      create: true,
      read: true,
      update: true,
      delete: true
    }
  };

  describe('validate', () => {
    it('valida configuración válida', () => {
      const result = CRUDValidator.validate(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rechaza configuración con targetPath inválido', () => {
      const invalidConfig = {
        ...validConfig,
        targetPath: '../../../etc/passwd'
      };
      
      const result = CRUDValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'targetPath')).toBe(true);
    });

    it('rechaza configuración con entityName inválido', () => {
      const invalidConfig = {
        ...validConfig,
        entityName: '123InvalidName'
      };
      
      const result = CRUDValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'entityName')).toBe(true);
    });

    it('rechaza configuración sin campos', () => {
      const invalidConfig = {
        ...validConfig,
        fields: []
      };
      
      const result = CRUDValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'fields')).toBe(true);
    });

    it('rechaza configuración con apiEndpoint inválido', () => {
      const invalidConfig = {
        ...validConfig,
        apiEndpoint: 'invalid-endpoint'
      };
      
      const result = CRUDValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'apiEndpoint')).toBe(true);
    });

    it('rechaza configuración sin campos visibles en lista', () => {
      const invalidConfig = {
        ...validConfig,
        fields: validConfig.fields.map(field => ({ ...field, showInList: false }))
      };
      
      const result = CRUDValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('showInList'))).toBe(true);
    });

    it('rechaza configuración con nombres de campo duplicados', () => {
      const invalidConfig = {
        ...validConfig,
        fields: [
          ...validConfig.fields,
          { ...validConfig.fields[0], label: 'Nombre 2' } // Mismo name, diferente label
        ]
      };
      
      const result = CRUDValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('duplicados'))).toBe(true);
    });

    it('rechaza configuración sin permisos habilitados', () => {
      const invalidConfig = {
        ...validConfig,
        permissions: {
          create: false,
          read: false,
          update: false,
          delete: false
        }
      };
      
      const result = CRUDValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'permissions')).toBe(true);
    });
  });

  describe('validateField', () => {
    it('valida campo de texto válido', () => {
      const field: EntityField = {
        name: 'nombre',
        type: 'text',
        label: 'Nombre',
        required: true,
        validation: { min: 2, max: 100 },
        searchable: true,
        sortable: true,
        filterable: true,
        showInList: true
      };

      const result = CRUDValidator.validateField(field);
      expect(result.valid).toBe(true);
    });

    it('rechaza campo con nombre inválido', () => {
      const field: any = {
        name: '123invalid',
        type: 'text',
        label: 'Test',
        required: true,
        searchable: false,
        sortable: false,
        filterable: false,
        showInList: false
      };

      const result = CRUDValidator.validateField(field);
      expect(result.valid).toBe(false);
    });

    it('rechaza campo de tipo inválido', () => {
      const field: any = {
        name: 'test',
        type: 'invalid-type',
        label: 'Test',
        required: true,
        searchable: false,
        sortable: false,
        filterable: false,
        showInList: false
      };

      const result = CRUDValidator.validateField(field);
      expect(result.valid).toBe(false);
    });
  });
});

describe('FieldValidators', () => {
  describe('validateRelationField', () => {
    it('valida campo de relación válido', () => {
      const field: EntityField = {
        name: 'categoria',
        type: 'relation',
        label: 'Categoría',
        required: true,
        searchable: true,
        sortable: true,
        filterable: true,
        showInList: true,
        relation: {
          endpoint: '/api/categorias/search',
          displayField: 'nombre',
          valueField: 'id',
          searchFields: ['nombre'],
          multiple: false,
          preload: false,
          minChars: 2,
          relationEntity: 'Categoria',
          allowCreate: false
        }
      };

      const errors = FieldValidators.validateRelationField(field);
      expect(errors).toHaveLength(0);
    });

    it('rechaza campo de relación sin configuración', () => {
      const field: EntityField = {
        name: 'categoria',
        type: 'relation',
        label: 'Categoría',
        required: true,
        searchable: true,
        sortable: true,
        filterable: true,
        showInList: true
      };

      const errors = FieldValidators.validateRelationField(field);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.code === 'missing_relation_config')).toBe(true);
    });

    it('advierte sobre minChars alto', () => {
      const field: EntityField = {
        name: 'categoria',
        type: 'relation',
        label: 'Categoría',
        required: true,
        searchable: true,
        sortable: true,
        filterable: true,
        showInList: true,
        relation: {
          endpoint: '/api/categorias/search',
          displayField: 'nombre',
          valueField: 'id',
          searchFields: ['nombre'],
          multiple: false,
          preload: false,
          minChars: 10, // Muy alto
          relationEntity: 'Categoria',
          allowCreate: false
        }
      };

      const errors = FieldValidators.validateRelationField(field);
      expect(errors.some(e => e.code === 'high_min_chars')).toBe(true);
    });
  });

  describe('validateSelectField', () => {
    it('valida campo select válido', () => {
      const field: EntityField = {
        name: 'estado',
        type: 'select',
        label: 'Estado',
        required: true,
        validation: {
          options: ['activo', 'inactivo']
        },
        searchable: false,
        sortable: true,
        filterable: true,
        showInList: true
      };

      const errors = FieldValidators.validateSelectField(field);
      expect(errors).toHaveLength(0);
    });

    it('rechaza campo select sin opciones', () => {
      const field: EntityField = {
        name: 'estado',
        type: 'select',
        label: 'Estado',
        required: true,
        searchable: false,
        sortable: true,
        filterable: true,
        showInList: true
      };

      const errors = FieldValidators.validateSelectField(field);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.code === 'missing_select_options')).toBe(true);
    });
  });

  describe('validateFileField', () => {
    it('valida campo file válido', () => {
      const field: EntityField = {
        name: 'imagen',
        type: 'file',
        label: 'Imagen',
        required: false,
        validation: {
          accept: 'image/*'
        },
        searchable: false,
        sortable: false,
        filterable: false,
        showInList: false
      };

      const errors = FieldValidators.validateFileField(field);
      expect(errors).toHaveLength(0);
    });

    it('rechaza campo file sin accept', () => {
      const field: EntityField = {
        name: 'archivo',
        type: 'file',
        label: 'Archivo',
        required: false,
        searchable: false,
        sortable: false,
        filterable: false,
        showInList: false
      };

      const errors = FieldValidators.validateFileField(field);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.code === 'missing_file_accept')).toBe(true);
    });
  });
});
