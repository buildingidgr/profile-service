# Use official Node.js LTS image
FROM node:18-alpine

# Install OpenSSL and other necessary dependencies
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Build TypeScript
RUN npm run build

# Expose the port from environment variable
EXPOSE ${PORT:-3000}

# Use dynamic port binding for Railway
CMD ["sh", "-c", "npm start"]

