# Overview

This is a full-stack file management application built with React/TypeScript on the frontend and Express/Node.js on the backend. The application allows users to browse, search, and manage files across directories with support for multimedia content including videos, images, audio, and documents. Key features include a hierarchical directory browser, file search functionality, video player with subtitle support, automated file scanning, recently viewed files tracking, and a responsive UI built with shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom configuration for development and production

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with dedicated routes for directories, files, and scan operations
- **File Operations**: Native file system operations with automated scanning capabilities
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple

## Database Layer
- **ORM**: Drizzle ORM with PostgreSQL adapter
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema**: Normalized schema with separate tables for users, directories, files, and scan jobs
- **Migrations**: Drizzle Kit for schema migrations and database management

## Core Data Models
- **Users**: Authentication and user management
- **Directories**: Hierarchical folder structure with parent-child relationships
- **Files**: Comprehensive file metadata including type, size, dimensions, duration, and subtitle information
- **Scan Jobs**: Background task tracking for automated file system scanning
- **Recent File Views**: User activity tracking for recently accessed files with view type classification (download, stream, info_view, modal_view)

## File Management System
- **File Types**: Categorized support for video, image, audio, document, and generic file types
- **Metadata Extraction**: Automatic extraction of file properties including dimensions, duration, and subtitle detection
- **Thumbnail Generation**: Configurable thumbnail path storage for visual previews
- **Search Functionality**: Text-based search across file names and directories
- **Recently Viewed Files**: Comprehensive tracking system for user file interactions with sidebar display and source-aware view type classification

## Authentication & Security
- **Session-based Authentication**: Server-side session management with PostgreSQL persistence
- **Password Security**: Bcrypt-based password hashing and verification
- **Input Validation**: Zod schema validation integrated with Drizzle ORM

## Development Features
- **Hot Module Replacement**: Vite development server with fast refresh
- **Error Handling**: Custom error overlay for development debugging
- **Logging**: Structured request/response logging with performance metrics
- **Path Aliases**: TypeScript path mapping for clean imports

## Configuration Options
- **SCAN_SCHEDULE**: Cron expression for automatic file scanning frequency (default: "0 */1 * * *" for hourly scans)
  - Set to "disabled" to turn off automatic scanning
  - Examples: "0 */6 * * *" (every 6 hours), "0 9 * * *" (daily at 9 AM)
- **SCAN_DIRECTORY**: Root directory for file scanning (default: "data")
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment mode (development/production)

# Recent Updates

## Recently Viewed Files System (September 2025)
- **Complete Implementation**: Added comprehensive file interaction tracking with dedicated database table and API endpoints
- **Smart View Type Classification**: Automatic categorization of file interactions (download, stream, info_view, modal_view) based on user action context
- **Source-Aware Tracking**: Differentiates between main grid clicks and recent files list interactions to prevent duplicate tracking entries
- **Integrated Sidebar Component**: Real-time display of recently accessed files with proper cache invalidation and responsive design
- **Comprehensive Testing**: Automated browser testing with Playwright to verify functionality and prevent regressions

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket connection pooling
- **Connection Pooling**: @neondatabase/serverless for optimized database connections

## UI Component Libraries
- **Radix UI**: Headless component primitives for accessibility and functionality
- **Lucide React**: Icon library for consistent visual elements
- **Embla Carousel**: Touch-friendly carousel implementation
- **React Hook Form**: Form state management with validation

## Development Tools
- **Vite Plugins**: 
  - Runtime error modal for development debugging
  - Cartographer for enhanced development experience in Replit environment
- **TypeScript**: Strict type checking with custom path resolution
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer

## File Processing
- **Node Cron**: Configurable scheduled file system scanning (default: every hour)
- **File System APIs**: Native Node.js fs/promises for file operations
- **Path Utilities**: Cross-platform path handling and resolution
- **Batch Operations**: Optimized bulk database operations for scanning and cleanup

## Deployment Platform
- **Replit Integration**: Custom banner injection and environment-specific optimizations
- **ESBuild**: Production bundling for server-side code
- **Static Asset Serving**: Express static middleware for production builds