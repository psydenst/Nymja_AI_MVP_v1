# Use Node.js 18 base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Clear any existing cache and install dependencies
RUN npm cache clean --force && \
    npm ci \
    --prefer-offline \
    --no-audit \
    --fetch-retries=10 \
    --fetch-retry-factor=3 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000

# Copy application files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
