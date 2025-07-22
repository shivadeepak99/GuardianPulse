# Guardian Web Dashboard

A React-based web application for Guardians to monitor and protect their Wards.

## Features

- **Authentication**: Secure login and registration system
- **Dashboard**: Monitor ward status and activity in real-time
- **Guardian Management**: Invite and manage guardian relationships
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=Guardian Web Dashboard
VITE_APP_VERSION=1.0.0
```

## Project Structure

```
src/
├── components/         # Reusable UI components
│   └── ProtectedRoute.tsx
├── pages/             # Page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── DashboardPage.tsx
├── services/          # API services and utilities
│   ├── api.ts
│   ├── authService.ts
│   └── guardianService.ts
├── App.tsx           # Main application component
└── main.tsx          # Application entry point
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

## API Integration

The application is configured to work with the Guardian Pulse API. Make sure the API server is running on `http://localhost:8080` or update the `VITE_API_URL` environment variable accordingly.

## Authentication

The application uses JWT tokens for authentication. Tokens are stored in localStorage and automatically included in API requests.

## Protected Routes

- `/dashboard` - Requires authentication
- `/login` and `/register` - Redirect to dashboard if already authenticated

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

