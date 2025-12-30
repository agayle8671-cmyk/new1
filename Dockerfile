FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build Vite app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Copy server file
COPY server.js ./

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]

