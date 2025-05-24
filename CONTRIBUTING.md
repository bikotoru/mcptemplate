# Contributing to NextJS CRUD Generator MCP

¡Gracias por tu interés en contribuir al proyecto! Este documento proporciona lineamientos y información sobre cómo contribuir efectivamente.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno de Desarrollo](#configuración-del-entorno-de-desarrollo)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Lineamientos de Código](#lineamientos-de-código)
- [Testing](#testing)
- [Documentación](#documentación)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Solicitar Features](#solicitar-features)

## Código de Conducta

Este proyecto adhiere a un código de conducta para asegurar un ambiente acogedor y inclusivo para todos los colaboradores. Al participar, se espera que mantengas este estándar.

### Nuestros Estándares

- **Sé respetuoso**: Trata a todos con respeto y consideración
- **Sé inclusivo**: Valora las diferentes perspectivas y experiencias
- **Sé constructivo**: Proporciona feedback útil y constructivo
- **Sé paciente**: Ayuda a otros a aprender y crecer

## Cómo Contribuir

Hay muchas formas de contribuir al proyecto:

### 🐛 Reportar Bugs
- Busca issues existentes antes de crear uno nuevo
- Proporciona información detallada sobre cómo reproducir el bug
- Incluye información del entorno (Node.js version, OS, etc.)

### ✨ Proponer Features
- Describe claramente el feature propuesto
- Explica por qué sería útil para el proyecto
- Considera el impacto en la arquitectura existente

### 📝 Mejorar Documentación
- Corrige errores tipográficos o gramaticales
- Mejora explicaciones existentes
- Agrega ejemplos o clarificaciones

### 💻 Contribuir Código
- Corrige bugs reportados
- Implementa features aprobados
- Mejora el rendimiento
- Refactoriza código para mejor mantenibilidad

## Configuración del Entorno de Desarrollo

### Requisitos Previos

- Node.js 18+ 
- npm 8+
- Git

### Configuración Inicial

1. **Fork el repositorio**
   ```bash
   # Fork en GitHub, luego clona tu fork
   git clone https://github.com/tu-usuario/nextjs-crud-generator-mcp.git
   cd nextjs-crud-generator-mcp
   ```

2. **Configura el upstream remote**
   ```bash
   git remote add upstream https://github.com/original-repo/nextjs-crud-generator-mcp.git
   ```

3. **Instala dependencias**
   ```bash
   npm install
   ```

4. **Configura tu entorno**
   ```bash
   # Copia configuración de ejemplo
   cp .env.example .env
   ```

5. **Ejecuta tests para verificar configuración**
   ```bash
   npm test
   ```

### Scripts de Desarrollo

```bash
# Desarrollo con watch mode
npm run dev

# Build del proyecto
npm run build

# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Cobertura de tests
npm run test:coverage

# Linting
npm run lint

# Formateo de código
npm run format

# Ejecutar ejemplo
npm run example
```

## Estructura del Proyecto

```
src/
├── generators/          # Lógica principal de generación
│   └── index.ts        # CRUDGenerator class
├── templates/          # Templates de Handlebars
│   └── crud/          # Templates para módulos CRUD
│       ├── components/ # Componentes React
│       ├── pages/     # Páginas Next.js
│       ├── api/       # API routes
│       ├── types/     # Tipos TypeScript
│       ├── hooks/     # React hooks
│       └── validation/ # Schemas Zod
├── types/             # Tipos globales del proyecto
│   └── index.ts
├── utils/             # Utilidades comunes
│   └── index.ts
├── validators/        # Validadores Zod
│   └── index.ts
├── __tests__/         # Tests unitarios
└── index.ts          # Punto de entrada MCP
```

### Componentes Clave

- **CRUDGenerator**: Clase principal que coordina la generación
- **Templates**: Archivos Handlebars para generar código
- **Validators**: Validación de configuraciones con Zod
- **Utils**: Funciones auxiliares para strings, archivos, etc.

## Lineamientos de Código

### Estilo de Código

- **TypeScript**: Todo el código debe estar tipado
- **ESM**: Usar ES modules
- **Naming Conventions**:
  - Variables y funciones: `camelCase`
  - Clases: `PascalCase`
  - Constantes: `UPPER_CASE`
  - Archivos: `kebab-case` o `camelCase`

### Principios de Diseño

1. **Separation of Concerns**: Cada módulo tiene una responsabilidad clara
2. **DRY (Don't Repeat Yourself)**: Evita duplicación de código
3. **SOLID Principles**: Especialmente Single Responsibility y Open/Closed
4. **Type Safety**: Usa TypeScript para prevenir errores en tiempo de compilación

### Templates

Los templates deben seguir estas convenciones:

```handlebars
{{!-- Comentarios descriptivos --}}
{{#each FIELDS}}
  {{!-- Lógica clara y bien documentada --}}
  {{#if (eq type 'text')}}
    {{!-- Código generado limpio --}}
  {{/if}}
{{/each}}
```

### Validación

- Todos los inputs deben ser validados con Zod
- Proporciona mensajes de error claros y útiles
- Valida tanto en cliente como en servidor (para APIs)

## Testing

### Estrategia de Testing

- **Unit Tests**: Para funciones puras y clases
- **Integration Tests**: Para flujos completos de generación
- **Template Tests**: Para validar salida de templates

### Escribir Tests

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = methodName(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

### Cobertura

- Mantén al menos 80% de cobertura
- Prioriza testing de lógica de negocio crítica
- Tests deben ser rápidos y confiables

## Documentación

### README
- Mantén ejemplos actualizados
- Documenta nuevas features
- Incluye screenshots si es relevante

### Code Comments
- Documenta el "por qué", no el "qué"
- Usa JSDoc para funciones públicas
- Mantén comentarios actualizados con cambios de código

### Changelog
- Sigue el formato [Keep a Changelog](https://keepachangelog.com/)
- Documenta breaking changes claramente
- Agrupa cambios por tipo (Added, Changed, Fixed, etc.)

## Proceso de Pull Request

### Antes de Enviar

1. **Actualiza tu fork**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Crea una branch para tu feature**
   ```bash
   git checkout -b feature/descripcion-clara
   ```

3. **Realiza cambios siguiendo las convenciones**

4. **Ejecuta tests y linting**
   ```bash
   npm test
   npm run lint
   npm run format
   ```

5. **Commit con mensajes descriptivos**
   ```bash
   git commit -m "feat: add support for custom validation rules"
   ```

### Formato de Commit

Usa [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Formateo, puntos y comas faltantes, etc.
- `refactor:` - Refactorización de código
- `test:` - Agregar o corregir tests
- `chore:` - Cambios en build process, dependencies, etc.

### Template de Pull Request

```markdown
## Descripción
Breve descripción de los cambios.

## Tipo de cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva feature (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que cambiaría funcionalidad existente)
- [ ] Cambio en documentación

## Testing
- [ ] Tests existentes pasan
- [ ] Agregué tests para nuevas funcionalidades
- [ ] Actualicé documentación relevante

## Checklist
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He realizado self-review de mi código
- [ ] He comentado código particularmente complejo
- [ ] He agregado tests que comprueban mi fix o feature
- [ ] Tests nuevos y existentes pasan localmente
```

## Reportar Bugs

### Template de Bug Report

```markdown
**Descripción del Bug**
Descripción clara y concisa del problema.

**Pasos para Reproducir**
1. Ve a '...'
2. Haz click en '....'
3. Scroll down to '....'
4. Ve el error

**Comportamiento Esperado**
Descripción clara de lo que esperabas que pasara.

**Screenshots**
Si aplica, agrega screenshots para explicar el problema.

**Entorno:**
 - OS: [e.g. iOS]
 - Node Version: [e.g. 18.17.0]
 - npm Version: [e.g. 9.6.7]
 - Proyecto Version: [e.g. 1.0.0]

**Contexto Adicional**
Agrega cualquier otro contexto sobre el problema.
```

## Solicitar Features

### Template de Feature Request

```markdown
**¿Tu feature request está relacionado con un problema?**
Descripción clara del problema. Ej. "Estoy siempre frustrado cuando [...]"

**Describe la solución que te gustaría**
Descripción clara y concisa de lo que quieres que pase.

**Describe alternativas que has considerado**
Descripción clara de cualquier solución o feature alternativa que hayas considerado.

**Contexto adicional**
Agrega cualquier otro contexto o screenshots sobre el feature request.
```

## Preguntas

Si tienes preguntas que no están cubiertas en esta guía:

1. Revisa la [documentación](README.md)
2. Busca en issues existentes
3. Pregunta en [Discussions](https://github.com/repo/discussions)
4. Contacta a los maintainers

## Reconocimientos

Agradecemos a todos los colaboradores que hacen este proyecto posible. Tu tiempo y esfuerzo son muy apreciados.

---

¡Gracias por contribuir! 🚀
