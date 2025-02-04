# Use official Node.js LTS image
FROM node:18-alpine

# Install OpenSSL
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
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

# Expose the port from environment variable
ENV PORT=3000
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]

