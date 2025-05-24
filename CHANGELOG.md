# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added
- Initial release of NextJS CRUD Generator MCP
- Complete CRUD module generation for Next.js applications
- Support for all basic field types (text, number, email, password, textarea, select, boolean, date, file)
- Advanced relation field support with search, multiple selection, and preloading
- TypeScript type generation with complete interfaces
- React Query hooks for optimized data management
- Zod validation schemas for forms and API
- Responsive UI components with Tailwind CSS
- Advanced filtering and search capabilities
- Pagination and sorting functionality
- Granular permission system (CRUD operations)
- Server-side rendering (SSR) support
- API routes with validation and error handling
- Comprehensive documentation generation
- MCP server implementation with 4 tools:
  - `generate_crud`: Complete CRUD module generation
  - `validate_config`: Configuration validation
  - `get_field_types`: Field type information
  - `generate_example_config`: Example configuration generation
- Template system with Handlebars
- File utilities and path validation
- Comprehensive error handling and logging
- Example configurations for different complexity levels
- Unit tests with Jest
- ESLint and Prettier configuration
- VS Code workspace configuration
- Complete development environment setup

### Features
- **Components Generated**:
  - EntityList: Main list with filtering, search, and pagination
  - EntityForm: Create/edit form with real-time validation
  - EntityTable: Sortable table with row selection
  - EntityFilter: Advanced filtering interface
  - EntitySearch: Search with autocomplete and suggestions

- **Pages Generated**:
  - Index page with SSR
  - Create page with form
  - Edit page with pre-populated data

- **API Routes Generated**:
  - GET /api/entity (list with filtering and pagination)
  - POST /api/entity (create with validation)
  - GET /api/entity/[id] (get by ID)
  - PUT /api/entity/[id] (update with validation)
  - DELETE /api/entity/[id] (delete with dependency check)

- **TypeScript Support**:
  - Complete interface definitions
  - Type-safe API responses
  - Form data types
  - Validation schemas
  - Helper types and utilities

- **Validation**:
  - Client-side validation with React Hook Form + Zod
  - Server-side validation for all API endpoints
  - Field-specific validation rules
  - Custom error messages
  - Form state management

- **Relation Support**:
  - Single and multiple relations
  - Dynamic search with debouncing
  - Preloaded options for small datasets
  - Create new relations inline
  - Flexible endpoint configuration

### Technical Details
- Built with TypeScript and modern ES modules
- Uses Handlebars for template processing
- Zod for runtime validation and type inference
- Comprehensive utility functions for string manipulation and file operations
- Modular architecture with clear separation of concerns
- Extensive error handling and user feedback
- Development tools integration (ESLint, Prettier, Jest)
- VS Code configuration for optimal development experience

### Documentation
- Complete README with usage examples
- API documentation for all generated endpoints
- Configuration schema documentation
- Field type reference
- Development setup guide
- Contributing guidelines

### Examples
- Simple entity example (User management)
- Complex entity example (Product catalog with relations)
- Programmatic usage examples
- Configuration templates for different use cases

## [Unreleased]

### Planned Features
- [ ] Custom template support
- [ ] Additional field types (rich text, JSON, array)
- [ ] Multiple database ORM support (Prisma, TypeORM, etc.)
- [ ] Automated test generation
- [ ] Internationalization (i18n) support
- [ ] Custom UI theme support
- [ ] CLI tool for standalone usage
- [ ] GraphQL API generation option
- [ ] Real-time updates with WebSockets
- [ ] File upload handling improvements
- [ ] Advanced search with full-text search
- [ ] Data export/import functionality
- [ ] Audit trail and versioning
- [ ] Role-based access control (RBAC)
- [ ] API documentation generation (OpenAPI/Swagger)
