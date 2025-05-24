/**
 * Utilidades para el generador CRUD
 */

import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import chalk from 'chalk';

/**
 * Convierte un string a diferentes formatos de nomenclatura
 */
export class StringUtils {
  /**
   * Convierte a PascalCase (ej: "mi entidad" -> "MiEntidad")
   */
  static toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '');
  }

  /**
   * Convierte a camelCase (ej: "mi entidad" -> "miEntidad")
   */
  static toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Convierte a kebab-case (ej: "mi entidad" -> "mi-entidad")
   */
  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  /**
   * Convierte a snake_case (ej: "mi entidad" -> "mi_entidad")
   */
  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  /**
   * Pluraliza un nombre simple (implementación básica)
   */
  static pluralize(str: string): string {
    if (str.endsWith('s')) return str;
    if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
    if (str.endsWith('ch') || str.endsWith('sh') || str.endsWith('x') || str.endsWith('z')) {
      return str + 'es';
    }
    return str + 's';
  }

  /**
   * Capitaliza la primera letra
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Convierte la primera letra a minúscula
   */
  static uncapitalize(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}

/**
 * Utilidades para manejo de archivos
 */
export class FileUtils {
  /**
   * Verifica si un directorio existe y tiene permisos de escritura
   */
  static async canWriteToDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.ensureDir(dirPath);
      await fs.access(dirPath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crea un directorio si no existe
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /**
   * Copia un archivo y reemplaza variables en el contenido
   */
  static async copyAndReplace(
    sourcePath: string,
    targetPath: string,
    replacements: Record<string, string>
  ): Promise<void> {
    let content = await fs.readFile(sourcePath, 'utf-8');
    
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    });

    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, content, 'utf-8');
  }

  /**
   * Lista todos los archivos en un directorio con un patrón específico
   */
  static async findFiles(pattern: string, cwd?: string): Promise<string[]> {
    return glob(pattern, { cwd, absolute: true });
  }

  /**
   * Lee un archivo JSON de forma segura
   */
  static async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Escribe un archivo JSON con formato
   */
  static async writeJson(filePath: string, data: any, spaces = 2): Promise<void> {
    const content = JSON.stringify(data, null, spaces);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Verifica si un archivo existe
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el tamaño de un archivo en bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Crea un backup de un archivo si existe
   */
  static async createBackup(filePath: string): Promise<string | null> {
    if (!(await this.exists(filePath))) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    
    await fs.copy(filePath, backupPath);
    return backupPath;
  }
}

/**
 * Utilidades para logging con colores
 */
export class Logger {
  private static verbose = false;
  private static enabled = true;

  static setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  static info(message: string, ...args: any[]): void {
    if (!this.enabled) return;
    console.error(chalk.blue('ℹ'), message, ...args);
  }

  static success(message: string): void {
    if (!this.enabled) return;
    console.error(chalk.green('✓'), message);
  }

  static warning(message: string): void {
    if (!this.enabled) return;
    console.error(chalk.yellow('⚠'), message);
  }

  static error(message: string): void {
    if (!this.enabled) return;
    console.error(chalk.red('✗'), message);
  }

  static debug(message: string): void {
    if (!this.enabled || !this.verbose) return;
    console.error(chalk.gray('🐛'), chalk.gray(message));
  }

  static progress(message: string): void {
    if (!this.enabled) return;
    console.error(chalk.cyan('⚡'), message);
  }

  static step(step: number, total: number, message: string): void {
    if (!this.enabled) return;
    const progress = `[${step}/${total}]`;
    console.error(chalk.magenta(progress), message);
  }
}

/**
 * Utilidades para validación
 */
export class ValidationUtils {
  /**
   * Valida que un nombre de entidad sea válido
   */
  static isValidEntityName(name: string): boolean {
    return /^[A-Za-z][A-Za-z0-9]*$/.test(name);
  }

  /**
   * Valida que un path sea válido y seguro
   */
  static isValidPath(path: string): boolean {
    try {
      // Verifica que no contenga caracteres peligrosos
      if (path.includes('..') || path.includes('<') || path.includes('>')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida que un endpoint de API sea válido
   */
  static isValidApiEndpoint(endpoint: string): boolean {
    return /^\/api\/[a-z0-9\-_/]+$/.test(endpoint);
  }

  /**
   * Valida que un nombre de campo sea válido
   */
  static isValidFieldName(name: string): boolean {
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  }
}

/**
 * Utilidades para manejo de dependencias
 */
export class DependencyUtils {
  /**
   * Verifica si un package.json existe en el directorio
   */
  static async hasPackageJson(projectPath: string): Promise<boolean> {
    const packagePath = path.join(projectPath, 'package.json');
    return FileUtils.exists(packagePath);
  }

  /**
   * Lee las dependencias actuales del proyecto
   */
  static async getProjectDependencies(projectPath: string): Promise<Record<string, string>> {
    const packagePath = path.join(projectPath, 'package.json');
    const packageJson = await FileUtils.readJson(packagePath);
    
    if (!packageJson || typeof packageJson !== 'object') {
      return {};
    }

    return {
      ...(packageJson as any).dependencies || {},
      ...(packageJson as any).devDependencies || {}
    };
  }

  /**
   * Verifica si las dependencias requeridas están instaladas
   */
  static async checkRequiredDependencies(
    projectPath: string,
    required: string[]
  ): Promise<{ missing: string[]; present: string[] }> {
    const dependencies = await this.getProjectDependencies(projectPath);
    const missing: string[] = [];
    const present: string[] = [];

    required.forEach(dep => {
      if (dependencies[dep]) {
        present.push(dep);
      } else {
        missing.push(dep);
      }
    });

    return { missing, present };
  }
}

/**
 * Utilidades para procesamiento de templates
 */
export class TemplateUtils {
  /**
   * Escapa caracteres especiales para usar en regex
   */
  static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Reemplaza variables en un template usando un objeto de contexto
   */
  static replaceVariables(template: string, context: Record<string, any>): string {
    let result = template;

    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(this.escapeRegex(placeholder), 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  /**
   * Procesa condicionales simples en templates
   */
  static processConditionals(template: string, context: Record<string, any>): string {
    // Procesa {{#if condition}} ... {{/if}}
    return template.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, content) => {
        return context[condition] ? content : '';
      }
    );
  }

  /**
   * Procesa loops simples en templates
   */
  static processLoops(template: string, context: Record<string, any>): string {
    // Procesa {{#each array}} ... {{/each}}
    return template.replace(
      /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, content) => {
        const array = context[arrayName];
        if (!Array.isArray(array)) return '';

        return array.map(item => {
          let itemContent = content;
          
          // Reemplaza {{this}} con el item actual
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
          
          // Si el item es un objeto, reemplaza {{prop}} con item.prop
          if (typeof item === 'object' && item !== null) {
            Object.entries(item).forEach(([key, value]) => {
              const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
              itemContent = itemContent.replace(regex, String(value));
            });
          }
          
          return itemContent;
        }).join('');
      }
    );
  }
}
