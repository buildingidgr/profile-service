# Use an official Node runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if it exists)
COPY package*.json ./

# Generate package-lock.json if it doesn't exist
RUN test -f package-lock.json || npm install --package-lock-only

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/api-service.js"]

