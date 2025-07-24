# Multi-stage build for GuardianPulse API
# Stage 1: Builder - Install dependencies and build TypeScript
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Copy prisma directory first (needed for postinstall script)
COPY prisma ./prisma

# Install all dependencies (including dev dependencies)
RUN pnpm install

# Copy the rest of the source code
COPY . .

# Generate Prisma client
RUN pnpm prisma:generate

# Run code quality checks
# RUN pnpm run code-quality

# Build TypeScript to JavaScript
RUN pnpm build

# Stage 2: Production - Create lean runtime image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install only production dependencies (without postinstall scripts)
RUN pnpm install --prod --ignore-scripts

# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist

# Copy .env file to the root for runtime
COPY --from=builder /app/.env ./.env

# Copy generated Prisma client from builder stage to the correct location for runtime
COPY --from=builder /app/src/generated ./src/generated

# Copy Prisma schema for runtime
COPY --from=builder /app/prisma ./prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S guardian -u 1001

# Change ownership of the app directory
RUN chown -R guardian:nodejs /app
USER guardian

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["pnpm", "start"]
