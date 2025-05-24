/**
 * Tests para utilidades
 */

import { StringUtils, ValidationUtils, TemplateUtils } from '../utils/index.js';

describe('StringUtils', () => {
  describe('toPascalCase', () => {
    it('convierte strings a PascalCase', () => {
      expect(StringUtils.toPascalCase('mi entidad')).toBe('MiEntidad');
      expect(StringUtils.toPascalCase('producto')).toBe('Producto');
      expect(StringUtils.toPascalCase('mi_entidad_compleja')).toBe('MiEntidadCompleja');
    });
  });

  describe('toCamelCase', () => {
    it('convierte strings a camelCase', () => {
      expect(StringUtils.toCamelCase('Mi Entidad')).toBe('miEntidad');
      expect(StringUtils.toCamelCase('Producto')).toBe('producto');
      expect(StringUtils.toCamelCase('mi entidad compleja')).toBe('miEntidadCompleja');
    });
  });

  describe('toKebabCase', () => {
    it('convierte strings a kebab-case', () => {
      expect(StringUtils.toKebabCase('MiEntidad')).toBe('mi-entidad');
      expect(StringUtils.toKebabCase('miEntidadCompleja')).toBe('mi-entidad-compleja');
      expect(StringUtils.toKebabCase('Producto Simple')).toBe('producto-simple');
    });
  });

  describe('toSnakeCase', () => {
    it('convierte strings a snake_case', () => {
      expect(StringUtils.toSnakeCase('MiEntidad')).toBe('mi_entidad');
      expect(StringUtils.toSnakeCase('miEntidadCompleja')).toBe('mi_entidad_compleja');
      expect(StringUtils.toSnakeCase('Producto Simple')).toBe('producto_simple');
    });
  });

  describe('pluralize', () => {
    it('pluraliza nombres simples', () => {
      expect(StringUtils.pluralize('producto')).toBe('productos');
      expect(StringUtils.pluralize('category')).toBe('categorys'); // Implementación básica
      expect(StringUtils.pluralize('box')).toBe('boxes');
      expect(StringUtils.pluralize('entity')).toBe('entities');
    });
  });

  describe('capitalize', () => {
    it('capitaliza la primera letra', () => {
      expect(StringUtils.capitalize('producto')).toBe('Producto');
      expect(StringUtils.capitalize('miEntidad')).toBe('MiEntidad');
    });
  });

  describe('uncapitalize', () => {
    it('convierte la primera letra a minúscula', () => {
      expect(StringUtils.uncapitalize('Producto')).toBe('producto');
      expect(StringUtils.uncapitalize('MiEntidad')).toBe('miEntidad');
    });
  });
});

describe('ValidationUtils', () => {
  describe('isValidEntityName', () => {
    it('valida nombres de entidad correctos', () => {
      expect(ValidationUtils.isValidEntityName('Producto')).toBe(true);
      expect(ValidationUtils.isValidEntityName('MiEntidad')).toBe(true);
      expect(ValidationUtils.isValidEntityName('Usuario123')).toBe(true);
    });

    it('rechaza nombres de entidad inválidos', () => {
      expect(ValidationUtils.isValidEntityName('123Producto')).toBe(false);
      expect(ValidationUtils.isValidEntityName('mi-entidad')).toBe(false);
      expect(ValidationUtils.isValidEntityName('mi entidad')).toBe(false);
      expect(ValidationUtils.isValidEntityName('')).toBe(false);
    });
  });

  describe('isValidPath', () => {
    it('valida paths seguros', () => {
      expect(ValidationUtils.isValidPath('./src/modules/producto')).toBe(true);
      expect(ValidationUtils.isValidPath('/home/user/project')).toBe(true);
      expect(ValidationUtils.isValidPath('C:\\Projects\\MyApp')).toBe(true);
    });

    it('rechaza paths peligrosos', () => {
      expect(ValidationUtils.isValidPath('../../../etc/passwd')).toBe(false);
      expect(ValidationUtils.isValidPath('path/with/<script>')).toBe(false);
      expect(ValidationUtils.isValidPath('path/with/>output')).toBe(false);
    });
  });

  describe('isValidApiEndpoint', () => {
    it('valida endpoints de API correctos', () => {
      expect(ValidationUtils.isValidApiEndpoint('/api/productos')).toBe(true);
      expect(ValidationUtils.isValidApiEndpoint('/api/usuarios')).toBe(true);
      expect(ValidationUtils.isValidApiEndpoint('/api/mi-entidad')).toBe(true);
    });

    it('rechaza endpoints inválidos', () => {
      expect(ValidationUtils.isValidApiEndpoint('api/productos')).toBe(false); // Sin /
      expect(ValidationUtils.isValidApiEndpoint('/productos')).toBe(false); // Sin /api
      expect(ValidationUtils.isValidApiEndpoint('/api/')).toBe(false); // Vacío
    });
  });

  describe('isValidFieldName', () => {
    it('valida nombres de campo correctos', () => {
      expect(ValidationUtils.isValidFieldName('nombre')).toBe(true);
      expect(ValidationUtils.isValidFieldName('fechaCreacion')).toBe(true);
      expect(ValidationUtils.isValidFieldName('miCampo123')).toBe(true);
    });

    it('rechaza nombres de campo inválidos', () => {
      expect(ValidationUtils.isValidFieldName('123campo')).toBe(false);
      expect(ValidationUtils.isValidFieldName('mi-campo')).toBe(false);
      expect(ValidationUtils.isValidFieldName('mi campo')).toBe(false);
      expect(ValidationUtils.isValidFieldName('')).toBe(false);
    });
  });
});

describe('TemplateUtils', () => {
  describe('escapeRegex', () => {
    it('escapa caracteres especiales de regex', () => {
      expect(TemplateUtils.escapeRegex('$')).toBe('\\$');
      expect(TemplateUtils.escapeRegex('(test)')).toBe('\\(test\\)');
      expect(TemplateUtils.escapeRegex('[test]')).toBe('\\[test\\]');
    });
  });

  describe('replaceVariables', () => {
    it('reemplaza variables en templates', () => {
      const template = 'Hola {{NOMBRE}}, tu edad es {{EDAD}}';
      const context = { NOMBRE: 'Juan', EDAD: '25' };
      const result = TemplateUtils.replaceVariables(template, context);
      expect(result).toBe('Hola Juan, tu edad es 25');
    });

    it('maneja variables no existentes', () => {
      const template = 'Hola {{NOMBRE}}, tu {{APELLIDO}}';
      const context = { NOMBRE: 'Juan' };
      const result = TemplateUtils.replaceVariables(template, context);
      expect(result).toBe('Hola Juan, tu {{APELLIDO}}');
    });
  });

  describe('processConditionals', () => {
    it('procesa condicionales simples', () => {
      const template = '{{#if activo}}Está activo{{/if}}';
      const context = { activo: true };
      const result = TemplateUtils.processConditionals(template, context);
      expect(result).toBe('Está activo');
    });

    it('omite contenido cuando la condición es falsa', () => {
      const template = '{{#if activo}}Está activo{{/if}}';
      const context = { activo: false };
      const result = TemplateUtils.processConditionals(template, context);
      expect(result).toBe('');
    });
  });

  describe('processLoops', () => {
    it('procesa loops simples', () => {
      const template = '{{#each items}}{{this}}, {{/each}}';
      const context = { items: ['a', 'b', 'c'] };
      const result = TemplateUtils.processLoops(template, context);
      expect(result).toBe('a, b, c, ');
    });

    it('procesa loops con objetos', () => {
      const template = '{{#each users}}{{name}}: {{age}}, {{/each}}';
      const context = { 
        users: [
          { name: 'Juan', age: 25 },
          { name: 'Ana', age: 30 }
        ]
      };
      const result = TemplateUtils.processLoops(template, context);
      expect(result).toBe('Juan: 25, Ana: 30, ');
    });
  });
});
