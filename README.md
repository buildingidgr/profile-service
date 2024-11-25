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

