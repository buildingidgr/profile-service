# Use official Node.js LTS image
FROM node:18-alpine

# Install OpenSSL and other necessary dependencies
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files and configuration
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN npm run prisma:generate

# Build TypeScript
RUN npm run build

# Ensure proper file structure for module aliases
RUN mkdir -p dist/shared/utils dist/services dist/api

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/health || exit 1

# Start the application
CMD ["npm", "start"]

