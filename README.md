# Profile Service

## Recent Updates
- Unified authentication across all profile-related endpoints
- Removed manual Clerk ID parameter requirements
- Enhanced security by using authenticated user's ID for all operations
- Improved error handling and authorization checks for preferences endpoints
- Updated Docker configuration to resolve OpenSSL dependencies
- Fixed MongoDB transaction limitations for professional info updates
- Improved error handling for professional info endpoints
- Enhanced compatibility with MongoDB configurations

## API Endpoints

### Profile Endpoints

- `GET /api/profiles/me`: Retrieve the current user's profile
  - Requires JWT authentication
  - Automatically uses the authenticated user's Clerk ID
  - Returns 401 if no user is authenticated
  - Returns 404 if no profile is found

- `POST /api/profiles/me`: Create a new profile
  - Requires JWT authentication
  - Automatically uses the authenticated user's Clerk ID
  - Prevents creating multiple profiles for the same user
  - Returns 401 if no user is authenticated
  - Returns 409 if profile already exists

- `PATCH /api/profiles/me`: Update the current user's profile
  - Requires JWT authentication
  - Automatically uses the authenticated user's Clerk ID
  - Allows updating profile information
  - Returns 401 if no user is authenticated

- `DELETE /api/profiles/me`: Delete the current user's profile
  - Requires JWT authentication
  - Automatically uses the authenticated user's Clerk ID
  - Returns 401 if no user is authenticated
  - Returns 204 on successful deletion

- `GET /api/profiles/me/preferences`: Retrieve user preferences
  - Requires JWT authentication
  - Uses authenticated user's Clerk ID directly from token
  - Returns 401 if no user is authenticated
  - Returns 404 if no preferences are found for the user

- `PATCH /api/profiles/me/preferences`: Update user preferences
  - Requires JWT authentication
  - Uses authenticated user's Clerk ID directly from token
  - Creates preferences if they don't exist
  - Returns 401 if no user is authenticated
  - Allows partial or full preference updates

- `POST /api/profiles/me/api-key`: Generate a new API key
  - Requires JWT authentication
  - Generates API key for the authenticated user
  - Returns new API key and associated tokens
  - Returns 401 if no user is authenticated

- `GET /api/profiles/me/professional`: Retrieve professional information
  - Requires JWT authentication
  - Uses authenticated user's Clerk ID
  - Returns 401 if no user is authenticated
  - Returns 404 if professional info not found

- `PATCH /api/profiles/me/professional`: Update professional information
  - Requires JWT authentication
  - Uses authenticated user's Clerk ID
  - Creates professional info if it doesn't exist
  - Allows updating professional details
  - Returns 401 if no user is authenticated

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

The token should contain a `sub` claim with the user's Clerk ID.

## Security Notes
- All profile-related operations are tied to the authenticated user's ID
- Users can only access and modify their own profile information
- Unauthorized access attempts return 401 or 403 status codes
- Users can only access and modify their own preferences
- Preference updates are scoped to the authenticated user

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

## MongoDB Configuration

### Replica Set Requirement
Prisma requires MongoDB to be configured as a replica set to support transactions. To work around this limitation:

#### Current Implementation
- Direct MongoDB collection operations are used for professional info
- Bypasses Prisma transaction requirements
- Provides atomic upsert functionality
- Ensures compatibility with single-node MongoDB setups

#### Approach Details
- Uses `findOneAndUpdate()` with `upsert` option
- Handles both update and create scenarios in a single operation
- Avoids Prisma transaction limitations

### Recommended Configurations
1. Use MongoDB Atlas (provides replica set by default)
2. Configure local MongoDB as a replica set
3. Use direct MongoDB collection methods for complex operations

### Troubleshooting
- Error: "Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set"
- Solution: 
  - Use direct MongoDB collection methods
  - Configure MongoDB as a replica set
  - Use a database service that supports replica sets

#### Local Development Setup
```bash
# Start MongoDB with replica set
mongod --replSet rs0

# In MongoDB shell
rs.initiate()
```

#### Railway Deployment
- Ensure MongoDB service is configured with replica set support
- Most Railway MongoDB services are pre-configured

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

