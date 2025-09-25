# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/gateway/package*.json ./packages/gateway/
COPY packages/engine-azure-gpt/package*.json ./packages/engine-azure-gpt/
COPY packages/engine-basic/package*.json ./packages/engine-basic/
COPY packages/engine-fuzzy/package*.json ./packages/engine-fuzzy/

# Install dependencies
RUN npm ci --workspace=@wonder/gateway --workspace=@wonder/engine-azure-gpt --workspace=@wonder/engine-basic --workspace=@wonder/engine-fuzzy

# Copy source code
COPY . .

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/database ./database
COPY --from=builder --chown=nodejs:nodejs /app/docs ./docs
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5050

# Set environment variables
ENV NODE_ENV=production \
    PORT=5050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5050/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the application with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/gateway/src/server.js"]