# DocuMind AI - Document Analysis Assistant

## Overview

DocuMind AI is a GenAI-powered document analysis application that helps users read and comprehend large documents like research papers, legal files, or technical manuals. The application allows users to upload documents and interact with them through two main modes: "Ask Anything" for free-form questions and "Challenge Me" for AI-generated comprehension questions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom context-based dark/light theme implementation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **File Processing**: Multer for file uploads, pdf-parse for PDF text extraction
- **AI Integration**: OpenAI GPT-4o for document analysis and question generation

### Database Design
The application uses three main tables:
- **documents**: Stores uploaded files with content, filename, and auto-generated summary
- **conversations**: Tracks user interactions in "Ask Anything" mode with message history
- **challenges**: Manages "Challenge Me" sessions with questions, answers, and evaluations

## Key Components

### Document Processing Pipeline
1. **File Upload**: Supports PDF and TXT files via drag-and-drop or file picker
2. **Content Extraction**: PDF parsing using pdf-parse library for text extraction
3. **Auto Summarization**: OpenAI integration generates 150-word summaries immediately after upload
4. **Storage**: Document content and metadata stored in PostgreSQL database

### AI-Powered Features
1. **Question Answering**: Context-aware responses grounded in document content with source references
2. **Challenge Generation**: AI creates comprehension-focused questions based on document content
3. **Answer Evaluation**: Automated assessment of user responses with detailed feedback
4. **Conversation Memory**: Maintains context across multiple question-answer exchanges

### User Interface Components
- **DocumentUpload**: Drag-and-drop file upload with progress indicators
- **DocumentSummary**: Displays auto-generated document summary with metadata
- **ChatInterface**: Dual-mode interface for both "Ask Anything" and "Challenge Me" interactions
- **Header**: Navigation with theme toggle and application branding

## Data Flow

1. **Document Upload Flow**:
   - User uploads PDF/TXT file
   - Backend extracts text content
   - OpenAI generates summary
   - Document stored in database
   - Summary displayed to user

2. **Ask Anything Mode**:
   - User submits question
   - Question sent to OpenAI with document context
   - AI generates response with source references
   - Conversation history maintained for follow-ups

3. **Challenge Me Mode**:
   - AI generates 3 comprehension questions from document
   - User answers questions sequentially
   - AI evaluates each response with feedback
   - Progress tracking through question sequence

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection (Neon serverless)
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **OpenAI**: AI service for document analysis and question generation
- **pdf-parse**: PDF text extraction utility
- **multer**: File upload middleware

### UI Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant-based styling
- **react-hook-form**: Form state management with validation

## Deployment Strategy

### Development Environment
- **Vite Development Server**: Hot module replacement and fast builds
- **TSX**: TypeScript execution for server development
- **Replit Integration**: Configured for Replit environment with development banners

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: ESBuild compiles TypeScript server to `dist/index.js`
- **Database**: Drizzle migrations in `migrations/` directory
- **Environment Variables**: DATABASE_URL and OPENAI_API_KEY required

### Key Configuration Files
- **drizzle.config.ts**: Database migration configuration
- **vite.config.ts**: Frontend build and development server setup
- **tsconfig.json**: TypeScript compilation settings with path aliases
- **tailwind.config.ts**: Design system and theme configuration

The application is designed as a full-stack TypeScript application with clear separation between client and server code, utilizing modern development practices and tools for optimal developer experience and performance.