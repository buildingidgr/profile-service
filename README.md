# Profile Service

## Recent Updates
- Fixed `/api/profiles/me` endpoint to automatically use authenticated user's ID
- Improved error handling in profile-related routes
- Updated Docker configuration to resolve OpenSSL dependencies

## API Endpoints

### Profile Endpoints

- `GET /api/profiles/me`: Retrieve the current user's profile
  - Requires JWT authentication
  - Automatically uses the authenticated user's Clerk ID
  - Returns 401 if no user is authenticated
  - Returns 404 if no profile is found

- `PATCH /api/profiles/me`: Update the current user's profile
  - Requires JWT authentication
  - Automatically uses the authenticated user's Clerk ID

- `GET /api/profiles/me/preferences`: Retrieve user preferences
  - Requires JWT authentication

- `PATCH /api/profiles/me/preferences`: Update user preferences
  - Requires JWT authentication

- `POST /api/profiles/me/api-key`: Generate a new API key
  - Requires JWT authentication
  - Returns new API key and associated tokens

- `GET /api/profiles/me/professional`: Retrieve professional information
  - Requires JWT authentication

- `PATCH /api/profiles/me/professional`: Update professional information
  - Requires JWT authentication

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

## Docker Setup

The service uses a Node.js 18 Alpine image with OpenSSL dependencies pre-installed.

### Building the Docker Image
```bash
docker build -t profile-service .
```

### Running the Container
```bash
docker run -p 3000:3000 profile-service
```

## Development

### Prerequisites
- Node.js 18+
- npm
- OpenSSL

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Build the project: `npm run build`
5. Start the server: `npm start`

## Environment Variables
- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token generation
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email service configuration

# MechHub API

This is the API service for MechHub, handling profile management and authentication.

## Deployment to Railway

To deploy this project to Railway, follow these steps:

1. Fork this repository to your GitHub account.

2. Create a new project on Railway and connect it to your GitHub repository.

3. In the Railway project settings, add the following environment variables:
   - `PORT`: 3000 (or your preferred port)
   - `NODE_ENV`: production
   - `NEXT_PUBLIC_APP_URL`: Your frontend app URL
   - `NEXT_PUBLIC_MARKETING_URL`: Your marketing site URL
   - `JWT_SECRET`: A secure random string for JWT signing
   - `DATABASE_URL`: Your PostgreSQL database URL (Railway will provide this)
   - `REDIS_URL`: Your Redis URL (Railway will provide this)

4. In the Railway project settings, add the following build command:

