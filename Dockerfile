# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY gateway/package*.json ./gateway/
COPY engine-azure-gpt5/package*.json ./engine-azure-gpt5/
COPY engine-basic/package*.json ./engine-basic/
COPY engine-fuzzy/package*.json ./engine-fuzzy/

# Install dependencies
RUN npm ci --workspace=gateway --workspace=engine-azure-gpt5 --workspace=engine-basic --workspace=engine-fuzzy

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
COPY --from=builder --chown=nodejs:nodejs /app/gateway ./gateway
COPY --from=builder --chown=nodejs:nodejs /app/engine-azure-gpt5 ./engine-azure-gpt5
COPY --from=builder --chown=nodejs:nodejs /app/engine-basic ./engine-basic
COPY --from=builder --chown=nodejs:nodejs /app/engine-fuzzy ./engine-fuzzy
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
CMD ["node", "gateway/src/server.js"]