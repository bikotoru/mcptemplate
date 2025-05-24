#!/usr/bin/env node

/**
 * Script de ejemplo para usar el generador CRUD programáticamente
 */

import { CRUDGenerator } from '../src/generators/index.js';
import { Logger } from '../src/utils/index.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    Logger.info('🚀 Iniciando ejemplo de generación CRUD');

    // Leer configuración de ejemplo
    const configPath = path.join(__dirname, 'producto-config.json');
    const config = await fs.readJson(configPath);

    Logger.info(`📋 Configuración cargada: ${config.entityName}`);

    // Crear generador
    const generator = new CRUDGenerator();

    // Verificar templates
    const templatesValid = await generator.validateTemplatesPath();
    if (!templatesValid) {
      throw new Error('❌ Templates no encontrados');
    }

    Logger.success('✅ Templates validados');

    // Configurar opciones
    const options = {
      overwrite: false,
      dryRun: true, // Cambiar a false para generar archivos reales
      verbose: true,
      skipValidation: false
    };

    // Cambiar ruta de destino para el ejemplo
    config.targetPath = path.join(__dirname, '../dist/example-output');

    Logger.info(`📁 Generando en: ${config.targetPath}`);

    // Generar CRUD
    const result = await generator.generate(config, options);

    // Mostrar resultado
    if (result.success) {
      Logger.success(`🎉 ${result.message}`);
      
      if (result.filesCreated.length > 0) {
        Logger.info('📄 Archivos que se generarían:');
        result.filesCreated.forEach(file => {
          Logger.info(`   ${file}`);
        });
      }
    } else {
      Logger.error(`❌ ${result.message}`);
      if (result.errors) {
        result.errors.forEach(error => Logger.error(`   ${error}`));
      }
    }

    // Mostrar siguiente pasos
    Logger.info(`
📖 Siguientes pasos:

1. Cambiar 'dryRun: false' en este script para generar archivos reales
2. Instalar dependencias requeridas:
   npm install @tanstack/react-query @tanstack/react-table react-hook-form @hookform/resolvers zod date-fns @heroicons/react

3. Configurar tu base de datos en las rutas API generadas
4. Personalizar los componentes según tu sistema de diseño
5. Configurar autenticación si es necesario

🎯 ¡Tu módulo CRUD estará listo para usar!
`);

  } catch (error) {
    Logger.error(`💥 Error en el ejemplo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    process.exit(1);
  }
}

// Ejecutar ejemplo
main().catch(console.error);
