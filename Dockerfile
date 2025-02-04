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

# Create necessary directories
RUN mkdir -p src/shared/utils src/shared/config

# Build TypeScript
RUN npm run build

# Expose the port from environment variable
ENV PORT=3000
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]

