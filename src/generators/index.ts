/**
 * Generador principal CRUD para Next.js
 * Procesa templates y genera código completo
 */

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { StringUtils, FileUtils, Logger, TemplateUtils } from '../utils/index.js';
import { CRUDValidator } from '../validators/index.js';
import type { 
  CRUDGeneratorConfig, 
  GenerationResult, 
  GeneratorOptions,
  TemplateContext,
  GeneratedFile
} from '../types/index.js';

// Obtener __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clase principal del generador CRUD
 */
export class CRUDGenerator {
  private templatesPath: string;
  private handlebars: typeof Handlebars;

  constructor(templatesPath?: string) {
    this.templatesPath = templatesPath || path.join(__dirname, '../templates/crud');
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Registra helpers personalizados para Handlebars
   */
  private registerHelpers(): void {
    // Helper para comparación
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('neq', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('and', (a: any, b: any) => a && b);
    this.handlebars.registerHelper('or', (a: any, b: any) => a || b);
    this.handlebars.registerHelper('not', (a: any) => !a);

    // Helper para transformaciones de string
    this.handlebars.registerHelper('capitalize', (str: string) => 
      StringUtils.capitalize(str)
    );
    this.handlebars.registerHelper('lower', (str: string) => 
      str.toLowerCase()
    );
    this.handlebars.registerHelper('upper', (str: string) => 
      str.toUpperCase()
    );
    this.handlebars.registerHelper('camelCase', (str: string) => 
      StringUtils.toCamelCase(str)
    );
    this.handlebars.registerHelper('kebabCase', (str: string) => 
      StringUtils.toKebabCase(str)
    );
    this.handlebars.registerHelper('snakeCase', (str: string) => 
      StringUtils.toSnakeCase(str)
    );

    // Helper para arrays
    this.handlebars.registerHelper('includes', (array: any[], value: any) => 
      Array.isArray(array) && array.includes(value)
    );
    this.handlebars.registerHelper('some', (array: any[], predicate: string) => 
      Array.isArray(array) && array.some((item: any) => item[predicate])
    );

    // Helper para JSON
    this.handlebars.registerHelper('json', (obj: any) => 
      JSON.stringify(obj, null, 2)
    );
    this.handlebars.registerHelper('JSON.stringify', (obj: any) => 
      JSON.stringify(obj)
    );

    // Helper condicional para verificar si es el primer elemento
    this.handlebars.registerHelper('ifFirst', function(this: any, index: number, options: any) {
      return index === 0 ? options.fn(this) : options.inverse(this);
    });

    // Helper condicional para verificar si es el último elemento
    this.handlebars.registerHelper('ifLast', function(this: any, index: number, array: any[], options: any) {
      return index === array.length - 1 ? options.fn(this) : options.inverse(this);
    });

    // Helper para obtener tipo TypeScript desde tipo de campo
    this.handlebars.registerHelper('getTypeScriptType', (fieldType: string) => {
      const typeMapping: Record<string, string> = {
        'text': 'string',
        'email': 'string',
        'password': 'string',
        'textarea': 'string',
        'select': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'date': 'Date',
        'file': 'string',
        'relation': 'any' // Será sobrescrito por la configuración específica
      };
      return typeMapping[fieldType] || 'string';
    });

    // Helper para formatear comentarios
    this.handlebars.registerHelper('comment', (text: string, style: string = '//') => {
      const lines = text.split('\n');
      return lines.map(line => `${style} ${line}`).join('\n');
    });
  }

  /**
   * Genera un módulo CRUD completo
   */
  async generate(config: CRUDGeneratorConfig, options: GeneratorOptions = {}): Promise<GenerationResult> {
    const { 
      overwrite = false, 
      dryRun = false, 
      verbose = false,
      skipValidation = false 
    } = options;

    if (verbose) {
      Logger.setVerbose(true);
    }

    try {
      Logger.info(`Iniciando generación de CRUD para ${config.entityName}`);

      // 1. Validar configuración
      if (!skipValidation) {
        Logger.step(1, 6, 'Validando configuración');
        const validation = CRUDValidator.validate(config);
        
        if (!validation.valid) {
          return {
            success: false,
            message: 'Configuración inválida',
            filesCreated: [],
            errors: validation.errors.map(e => `${e.field}: ${e.message}`)
          };
        }

        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => Logger.warning(warning));
        }
      }

      // 2. Verificar permisos de escritura
      Logger.step(2, 6, 'Verificando permisos de directorio');
      const pathValidation = await CRUDValidator.validateTargetPath(config.targetPath);
      
      if (!pathValidation.valid) {
        return {
          success: false,
          message: 'Error de permisos en directorio destino',
          filesCreated: [],
          errors: pathValidation.errors.map(e => e.message)
        };
      }

      // 3. Crear contexto de template
      Logger.step(3, 6, 'Preparando contexto de templates');
      const context = this.createTemplateContext(config);

      // 4. Buscar y procesar templates
      Logger.step(4, 6, 'Localizando templates');
      const templateFiles = await this.findTemplateFiles();
      
      if (templateFiles.length === 0) {
        return {
          success: false,
          message: 'No se encontraron templates',
          filesCreated: [],
          errors: [`Templates no encontrados en: ${this.templatesPath}`]
        };
      }

      Logger.debug(`Encontrados ${templateFiles.length} templates`);

      // 5. Generar archivos
      Logger.step(5, 6, 'Generando archivos');
      const generatedFiles: GeneratedFile[] = [];
      const errors: string[] = [];

      for (const templateFile of templateFiles) {
        try {
          const generated = await this.processTemplate(
            templateFile, 
            context, 
            config.targetPath,
            overwrite,
            dryRun
          );
          
          if (generated) {
            generatedFiles.push(generated);
            Logger.debug(`✓ ${generated.path}`);
          }
        } catch (error) {
          const errorMsg = `Error procesando ${templateFile}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          errors.push(errorMsg);
          Logger.error(errorMsg);
        }
      }

      // 6. Crear archivo README
      Logger.step(6, 6, 'Creando documentación');
      const readmeFile = await this.generateReadme(context, config.targetPath, dryRun);
      if (readmeFile) {
        generatedFiles.push(readmeFile);
      }

      // Resultado final
      const result: GenerationResult = {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `CRUD generado exitosamente para ${config.entityName} (${generatedFiles.length} archivos)`
          : `Generación completada con errores (${generatedFiles.length} archivos creados, ${errors.length} errores)`,
        filesCreated: generatedFiles.map(f => f.path),
        errors: errors.length > 0 ? errors : undefined
      };

      // Log de resultado
      if (result.success) {
        Logger.success(result.message);
        Logger.info('Archivos generados:');
        generatedFiles.forEach(file => {
          Logger.info(`  ${file.type}: ${file.path}`);
        });
      } else {
        Logger.error(result.message);
      }

      return result;

    } catch (error) {
      Logger.error(`Error fatal en generación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      return {
        success: false,
        message: 'Error fatal durante la generación',
        filesCreated: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Crea el contexto para los templates
   */
  private createTemplateContext(config: CRUDGeneratorConfig): TemplateContext {
    const entityName = StringUtils.toPascalCase(config.entityName);
    const entityNamePlural = StringUtils.toPascalCase(config.entityNamePlural);

    return {
      ENTITY_NAME: entityName,
      ENTITY_NAME_LOWER: StringUtils.uncapitalize(entityName),
      ENTITY_NAME_PLURAL: entityNamePlural,
      ENTITY_NAME_PLURAL_LOWER: StringUtils.uncapitalize(entityNamePlural),
      ENTITY_NAME_UPPER: entityName.toUpperCase(),
      API_ENDPOINT: config.apiEndpoint,
      FIELDS: config.fields,
      PERMISSIONS: config.permissions,
      RELATION_ENDPOINTS: config.relationEndpoints || {},
      TIMESTAMP: new Date().toISOString(),
      VERSION: '1.0.0'
    };
  }

  /**
   * Busca todos los archivos de template
   */
  private async findTemplateFiles(): Promise<string[]> {
    const patterns = [
      '**/*.template',
      '**/*.tsx.template',
      '**/*.ts.template',
      '**/*.js.template'
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const foundFiles = await FileUtils.findFiles(pattern, this.templatesPath);
        files.push(...foundFiles);
      } catch (error) {
        Logger.debug(`No se encontraron archivos con patrón ${pattern}`);
      }
    }

    return [...new Set(files)]; // Eliminar duplicados
  }

  /**
   * Procesa un archivo de template individual
   */
  private async processTemplate(
    templatePath: string,
    context: TemplateContext,
    targetBasePath: string,
    overwrite: boolean,
    dryRun: boolean
  ): Promise<GeneratedFile | null> {
    try {
      // Leer contenido del template
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Compilar template con Handlebars
      const template = this.handlebars.compile(templateContent);
      const generatedContent = template(context);

      // Determinar ruta de destino
      const relativePath = path.relative(this.templatesPath, templatePath);
      let targetPath = path.join(targetBasePath, relativePath);

      // Reemplazar variables en el nombre del archivo
      targetPath = this.processFileName(targetPath, context);
      
      // Remover extensión .template
      targetPath = targetPath.replace(/\.template$/, '');

      // Verificar si el archivo ya existe
      if (!overwrite && await FileUtils.exists(targetPath)) {
        Logger.warning(`Archivo ya existe: ${targetPath} (usar --overwrite para sobrescribir)`);
        return null;
      }

      // Crear backup si existe y se va a sobrescribir
      if (overwrite && await FileUtils.exists(targetPath)) {
        const backupPath = await FileUtils.createBackup(targetPath);
        if (backupPath) {
          Logger.debug(`Backup creado: ${backupPath}`);
        }
      }

      // En modo dry-run, solo simular
      if (dryRun) {
        Logger.info(`[DRY RUN] Se generaría: ${targetPath}`);
        return {
          path: targetPath,
          type: this.getFileType(targetPath),
          description: `Template: ${path.basename(templatePath)}`
        };
      }

      // Crear directorio si no existe
      await FileUtils.ensureDirectory(path.dirname(targetPath));

      // Escribir archivo
      await fs.writeFile(targetPath, generatedContent, 'utf-8');

      return {
        path: targetPath,
        type: this.getFileType(targetPath),
        description: `Generated from ${path.basename(templatePath)}`
      };

    } catch (error) {
      throw new Error(`Error procesando template ${templatePath}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Procesa el nombre del archivo reemplazando variables
   */
  private processFileName(filePath: string, context: TemplateContext): string {
    let processedPath = filePath;

    // Reemplazar placeholders comunes en nombres de archivo
    const replacements: Record<string, string> = {
      '[Entity]': context.ENTITY_NAME,
      '[entity]': context.ENTITY_NAME_LOWER,
      '[ENTITY]': context.ENTITY_NAME_UPPER,
      '[Entities]': context.ENTITY_NAME_PLURAL,
      '[entities]': context.ENTITY_NAME_PLURAL_LOWER,
      '[id]': '[id]' // Preservar [id] para rutas dinámicas de Next.js
    };

    Object.entries(replacements).forEach(([placeholder, replacement]) => {
      processedPath = processedPath.replace(new RegExp(placeholder.replace(/[[\]]/g, '\\$&'), 'g'), replacement);
    });

    return processedPath;
  }

  /**
   * Determina el tipo de archivo basado en su ruta
   */
  private getFileType(filePath: string): GeneratedFile['type'] {
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/pages/')) return 'page';
    if (filePath.includes('/api/')) return 'api';
    if (filePath.includes('/types/')) return 'type';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/validation/')) return 'validation';
    return 'other';
  }

  /**
   * Genera archivo README con documentación
   */
  private async generateReadme(
    context: TemplateContext,
    targetPath: string,
    dryRun: boolean
  ): Promise<GeneratedFile | null> {
    const readmeContent = this.generateReadmeContent(context);
    const readmePath = path.join(targetPath, 'README.md');

    if (dryRun) {
      Logger.info(`[DRY RUN] Se generaría: ${readmePath}`);
      return {
        path: readmePath,
        type: 'other',
        description: 'Documentation file'
      };
    }

    try {
      await fs.writeFile(readmePath, readmeContent, 'utf-8');
      return {
        path: readmePath,
        type: 'other',
        description: 'Generated documentation'
      };
    } catch (error) {
      Logger.error(`Error generando README: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return null;
    }
  }

  /**
   * Genera el contenido del README
   */
  private generateReadmeContent(context: TemplateContext): string {
    return `# ${context.ENTITY_NAME_PLURAL} CRUD Module

Generated automatically by MCP CRUD Generator on ${new Date(context.TIMESTAMP).toLocaleString()}

## Overview

This module provides complete CRUD (Create, Read, Update, Delete) functionality for ${context.ENTITY_NAME_PLURAL} in a Next.js application.

## Generated Files

### Components
- \`components/${context.ENTITY_NAME}List.tsx\` - Main list component with filtering and pagination
- \`components/${context.ENTITY_NAME}Form.tsx\` - Form component for create/edit operations
- \`components/${context.ENTITY_NAME}Table.tsx\` - Table component with sorting and selection
- \`components/${context.ENTITY_NAME}Filter.tsx\` - Advanced filtering component
- \`components/${context.ENTITY_NAME}Search.tsx\` - Search component with suggestions

### Pages
- \`pages/${context.ENTITY_NAME_LOWER}/index.tsx\` - Main listing page
- \`pages/${context.ENTITY_NAME_LOWER}/create.tsx\` - Creation page
- \`pages/${context.ENTITY_NAME_LOWER}/[id]/edit.tsx\` - Edit page

### API Routes
- \`api/${context.ENTITY_NAME_LOWER}/index.ts\` - GET (list) and POST (create) operations
- \`api/${context.ENTITY_NAME_LOWER}/[id].ts\` - GET (detail), PUT (update), and DELETE operations

### TypeScript Types
- \`types/${context.ENTITY_NAME_LOWER}.ts\` - All TypeScript interfaces and types

### Hooks
- \`hooks/use${context.ENTITY_NAME}.ts\` - React Query hooks for data management

### Validation
- \`validation/${context.ENTITY_NAME_LOWER}.ts\` - Zod validation schemas

## Features

### Permissions
${Object.entries(context.PERMISSIONS).map(([action, enabled]) => 
  `- ${action.toUpperCase()}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`
).join('\n')}

### Fields
${context.FIELDS.map(field => 
  `- **${field.label}** (${field.type})${field.required ? ' - Required' : ''}`
).join('\n')}

### Field Capabilities
${context.FIELDS.map(field => {
  const capabilities = [];
  if (field.searchable) capabilities.push('Searchable');
  if (field.sortable) capabilities.push('Sortable');
  if (field.filterable) capabilities.push('Filterable');
  if (field.showInList) capabilities.push('Show in List');
  return `- **${field.label}**: ${capabilities.join(', ') || 'Display only'}`;
}).join('\n')}

## Usage

### Basic List
\`\`\`tsx
import { ${context.ENTITY_NAME}List } from './components/${context.ENTITY_NAME}List';

function ${context.ENTITY_NAME_PLURAL}Page() {
  return <${context.ENTITY_NAME}List />;
}
\`\`\`

### Using Hooks
\`\`\`tsx
import { use${context.ENTITY_NAME} } from './hooks/use${context.ENTITY_NAME}';

function MyComponent() {
  const { data, isLoading, create${context.ENTITY_NAME} } = use${context.ENTITY_NAME}.useManager();
  
  // Your component logic
}
\`\`\`

### API Endpoints
- \`GET ${context.API_ENDPOINT}\` - List ${context.ENTITY_NAME_PLURAL_LOWER}
- \`POST ${context.API_ENDPOINT}\` - Create ${context.ENTITY_NAME_LOWER}
- \`GET ${context.API_ENDPOINT}/[id]\` - Get ${context.ENTITY_NAME_LOWER} by ID
- \`PUT ${context.API_ENDPOINT}/[id]\` - Update ${context.ENTITY_NAME_LOWER}
- \`DELETE ${context.API_ENDPOINT}/[id]\` - Delete ${context.ENTITY_NAME_LOWER}

## Required Dependencies

Make sure these dependencies are installed in your Next.js project:

\`\`\`json
{
  "@tanstack/react-query": "^5.0.0",
  "@tanstack/react-table": "^8.0.0",
  "react-hook-form": "^7.0.0",
  "@hookform/resolvers": "^3.0.0",
  "zod": "^3.22.0",
  "date-fns": "^2.30.0",
  "@heroicons/react": "^2.0.0"
}
\`\`\`

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

- This module was generated with permissions: ${JSON.stringify(context.PERMISSIONS)}
- API endpoint base: \`${context.API_ENDPOINT}\`
- Generated with ${context.FIELDS.length} fields
- Supports ${context.FIELDS.filter(f => f.type === 'relation').length} relationship(s)

---

Generated by MCP CRUD Generator v${context.VERSION}
`;
  }

  /**
   * Verifica la disponibilidad de templates
   */
  async validateTemplatesPath(): Promise<boolean> {
    try {
      const exists = await FileUtils.exists(this.templatesPath);
      if (!exists) {
        Logger.error(`Directorio de templates no encontrado: ${this.templatesPath}`);
        return false;
      }

      const templates = await this.findTemplateFiles();
      if (templates.length === 0) {
        Logger.error(`No se encontraron templates en: ${this.templatesPath}`);
        return false;
      }

      Logger.debug(`Templates válidos encontrados: ${templates.length}`);
      return true;
    } catch (error) {
      Logger.error(`Error validando templates: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return false;
    }
  }
}

export default CRUDGenerator;
