FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Accept build arguments for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set as environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build with environment variables
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Copy server
COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
