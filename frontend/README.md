# SafeBallot React Frontend

This is the React-based frontend for SafeBallot, a secure online voting application.

## Getting Started

Follow these instructions to get the frontend up and running on your local machine.

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Navigate to the frontend-react directory:

```bash
cd frontend-react
```

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm start
```

The application will open in your default browser at [http://localhost:3000](http://localhost:3000).

## Architecture

The SafeBallot React frontend follows a modern React application structure:

- **Components**: Reusable UI components
- **Pages**: Application pages and views
- **Services**: API integration and services
- **Store**: Redux store with slices for state management
- **Styles**: Theme configuration and global styles
- **Utils**: Utility functions and helpers

## Features

- **Authentication**: Login, registration, and multi-factor authentication
- **Election Management**: Create, manage, and view elections
- **Ballot Building**: Create and configure ballots with customizable questions
- **Voting**: Secure ballot submission process
- **Results**: View election results and statistics

## Technologies Used

- React
- Redux (with Redux Toolkit)
- React Router
- Material-UI
- Axios
