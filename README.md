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

### Type Definitions
Comprehensive type definitions are crucial for TypeScript development:
- `@types/node`: Node.js runtime types
- `@types/express`: Express.js type definitions
- `@types/express-rate-limit`: Rate limiting type support
- `@types/cors`: CORS middleware types
- `@types/jsonwebtoken`: JWT type definitions
- `@types/mongodb`: MongoDB type support
- `@types/nodemailer`: Email service types

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Install type definitions: `npm install --save-dev @types/node @types/express @types/express-rate-limit @types/cors @types/jsonwebtoken @types/mongodb @types/nodemailer`
4. Generate Prisma client: `npx prisma generate`
5. Build the project: `npm run build`
6. Start the server: `npm start`

### TypeScript Configuration

#### Compiler Options
- `target`: Specifies ECMAScript target version
- `module`: Sets module system (CommonJS)
- `rootDir`: Defines source code directory
- `outDir`: Specifies compiled JavaScript output directory
- `esModuleInterop`: Enables default imports from CommonJS modules
- `strict`: Enables comprehensive type checking
- `skipLibCheck`: Skips type checking of declaration files

#### Type Management
- Use `@types` packages for type definitions
- Extend built-in types for custom properties
- Avoid type assertions when possible

#### Request Type Extension Example
```typescript
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub?: string;
    };
    userId?: string;
  }
}
```

#### Recommended Practices
1. Use type definitions for all dependencies
2. Leverage module augmentation for custom types
3. Minimize use of type assertions
4. Keep `tsconfig.json` configuration minimal and explicit

#### Troubleshooting Type Errors
- Verify `@types` packages are installed
- Check package versions compatibility
- Use `typeRoots` to specify type definition locations
- Restart TypeScript server in your IDE

#### Advanced Type Configuration
```json
{
  "compilerOptions": {
    "types": ["node"],
    "typeRoots": ["./node_modules/@types"],
    "lib": [
      "es2016",
      "esnext.asynciterable",
      "dom"
    ]
  }
}
```

### Performance Considerations
- Minimal type checking improves build speed
- Use `skipLibCheck` to reduce compilation time
- Keep type definitions up to date
- Monitor TypeScript compiler performance

## Environment Variables
- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token generation
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email service configuration

## MongoDB Configuration

### Robust MongoDB Client Management
- Implements lazy initialization of MongoDB client
- Ensures single client instance per controller lifecycle
- Provides safe connection and disconnection methods

#### Key Improvements
- Lazy client creation with `getMongoClient()`
- Prevents multiple simultaneous connections
- Safely closes and nullifies client after use
- Handles connection errors gracefully

### Connection Lifecycle
```typescript
private mongoClient: MongoClient | null = null;

private async getMongoClient(): Promise<MongoClient> {
  if (!this.mongoClient) {
    this.mongoClient = new MongoClient(config.databaseUrl);
    await this.mongoClient.connect();
  }
  return this.mongoClient;
}

private async closeMongoClient() {
  if (this.mongoClient) {
    await this.mongoClient.close();
    this.mongoClient = null;
  }
}
```

### Rate Limiting and Proxy Configuration

### Enhanced Security Approach
- Configures `trust proxy` with minimal trust level
- Implements advanced rate limiting strategies
- Protects against IP-based and user-based rate limiting abuse

#### Key Security Features
- Only trust the first proxy in the chain
- Combine IP and user ID for rate limiting
- Skip rate limiting for failed requests
- Validate X-Forwarded-For headers

#### Rate Limiter Configuration
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  skipFailedRequests: true,
  keyGenerator: (req) => {
    const baseIP = req.ip;
    const userId = req.user?.sub || req.userId;
    return userId ? `${baseIP}-${userId}` : baseIP;
  },
  validate: {
    trustProxy: true,
    xForwardedForHeader: true
  }
});
```

### MongoDB Client Management

#### Static Client Approach
- Uses static methods for MongoDB client management
- Ensures single, shared client instance across requests
- Provides thread-safe connection handling

#### Connection Lifecycle Methods
```typescript
private static mongoClient: MongoClient | null = null;

private static async initMongoClient(): Promise<MongoClient> {
  if (!this.mongoClient) {
    this.mongoClient = new MongoClient(config.databaseUrl);
    await this.mongoClient.connect();
  }
  return this.mongoClient;
}

private static async closeMongoClient() {
  if (this.mongoClient) {
    await this.mongoClient.close();
    this.mongoClient = null;
  }
}
```

### Recommended Practices
1. Use static client management
2. Implement proper connection lifecycle methods
3. Validate and sanitize rate limiting inputs
4. Minimize trust in proxy configurations

### Performance Considerations
- Shared MongoDB client reduces connection overhead
- Advanced rate limiting prevents abuse
- Secure proxy configuration protects against spoofing

### Security Notes
- Limit trusted proxies
- Combine multiple identifiers for rate limiting
- Implement robust error handling
- Monitor and log rate limit events

### Troubleshooting
- Verify database connection URL
- Check network and firewall configurations
- Ensure proper error handling
- Monitor connection lifecycle

### Performance Considerations
- Lazy client creation reduces initial overhead
- Single client instance per request
- Proper connection management prevents resource leaks

### Security Notes
- Use secure, encrypted connection strings
- Never hardcode database credentials
- Implement proper connection error handling

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

