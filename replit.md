# Overview

This is a full-stack file management application built with React/TypeScript on the frontend and Express/Node.js on the backend. The application allows users to browse, search, and manage files across directories with support for multimedia content including videos, images, audio, and documents. Key features include a hierarchical directory browser, file search functionality, video player with subtitle support, automated file scanning, and a responsive UI built with shadcn/ui components.

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

## File Management System
- **File Types**: Categorized support for video, image, audio, document, and generic file types
- **Metadata Extraction**: Automatic extraction of file properties including dimensions, duration, and subtitle detection
- **Thumbnail Generation**: Configurable thumbnail path storage for visual previews
- **Search Functionality**: Text-based search across file names and directories

## Authentication & Security
- **Session-based Authentication**: Server-side session management with PostgreSQL persistence
- **Password Security**: Bcrypt-based password hashing and verification
- **Input Validation**: Zod schema validation integrated with Drizzle ORM

## Development Features
- **Hot Module Replacement**: Vite development server with fast refresh
- **Error Handling**: Custom error overlay for development debugging
- **Logging**: Structured request/response logging with performance metrics
- **Path Aliases**: TypeScript path mapping for clean imports

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
- **Node Cron**: Scheduled file system scanning every 5 minutes
- **File System APIs**: Native Node.js fs/promises for file operations
- **Path Utilities**: Cross-platform path handling and resolution

## Deployment Platform
- **Replit Integration**: Custom banner injection and environment-specific optimizations
- **ESBuild**: Production bundling for server-side code
- **Static Asset Serving**: Express static middleware for production builds