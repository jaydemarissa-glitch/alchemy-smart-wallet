# Overview

This is a React-based smart wallet application built with Express.js backend that integrates with Alchemy's blockchain infrastructure. The application provides users with multi-chain wallet management, asset tracking, transaction history, and gasless transaction capabilities. It uses Replit authentication for user management and supports Ethereum, BSC, Polygon, Base, and Arbitrum networks.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **State Management**: TanStack React Query for server state and API data management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Framework**: Express.js with TypeScript running in ESM mode
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth integration with session-based authentication using express-session
- **API Structure**: RESTful endpoints organized by feature (auth, wallets, assets, transactions, gas policies)
- **Middleware**: Custom logging, error handling, and authentication middleware

## Database Design
- **ORM**: Drizzle with PostgreSQL dialect for schema management and migrations
- **Schema Structure**: 
  - Users table for authentication data
  - Smart wallets for multi-chain wallet management
  - Assets table for token/cryptocurrency information
  - Token balances for user portfolio tracking
  - Transactions for blockchain transaction history
  - Gas policies for gasless transaction configuration
  - Sessions table for authentication session storage

## Authentication System
- **Provider**: Replit OpenID Connect (OIDC) integration
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Security**: HTTP-only cookies with secure settings for production
- **User Flow**: OAuth login with automatic user creation and session management

## Multi-Chain Support
- **Supported Networks**: Ethereum (1), BSC (56), Polygon (137), Base (8453), Arbitrum (42161)
- **Chain Management**: Dynamic chain selection with network-specific configurations
- **Asset Tracking**: Per-chain asset management with USD value calculations
- **Transaction History**: Cross-chain transaction tracking and status monitoring

# External Dependencies

## Blockchain Infrastructure
- **Alchemy SDK**: Primary blockchain data provider for all supported networks
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **WebSocket Support**: Real-time blockchain data via Neon's WebSocket constructor

## Authentication Services
- **Replit Authentication**: OAuth provider using OpenID Connect standard
- **Session Storage**: PostgreSQL-based session management for scalability

## UI and Development Tools
- **Shadcn/ui**: Complete component library built on Radix UI primitives
- **Lucide React**: Icon library for consistent iconography
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe variant API for component styling

## Development and Build Tools
- **Vite**: Fast development server and build tool with HMR support
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production deployment
- **PostCSS**: CSS processing with Tailwind and Autoprefixer