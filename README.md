# Loan Assessment Portal

A mobile-first web application for financial advisors to perform loan pre-qualification assessments.

## Features

- **Mobile-Optimized Interface**: Touch-friendly design with responsive layouts
- **Secure Authentication**: Session-based login system for financial advisors
- **CUIT Validation**: Real-time validation of Argentina tax identification numbers
- **Instant Assessment**: Automated loan eligibility evaluation with scoring
- **Assessment History**: Complete audit trail of all evaluations
- **Cross-Platform**: Works seamlessly on mobile and desktop devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the migration file in the Supabase SQL editor
   - Copy your project URL and anon key

4. Create environment file:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials.

5. Start the development server:
   ```bash
   npm run dev
   ```

### Demo Credentials

- **Email**: advisor@example.com
- **Password**: demo123

## Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/         # Custom React hooks
├── lib/           # External service integrations
├── pages/         # Application pages/screens
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── App.tsx        # Main application component
```

## Key Features

### CUIT Validation
- Real-time format validation (XX-XXXXXXXX-X)
- Checksum verification using official algorithm
- Automatic formatting as user types

### Assessment Engine
- Multi-factor eligibility evaluation
- Weighted scoring system
- Configurable assessment criteria
- Visual results presentation

### Data Management
- Automatic assessment saving
- Real-time database synchronization
- Comprehensive audit trail
- Secure data transmission

## Deployment

Build for production:
```bash
npm run build
```

The application can be deployed to any static hosting service (Netlify, Vercel, etc.).

## Security

- Row-level security (RLS) policies
- Authenticated API endpoints
- Secure session management
- Input validation and sanitization

## License

Private - All rights reserved