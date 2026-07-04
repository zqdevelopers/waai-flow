# Dockerfile for WAAI Flow Backend
FROM node:22-alpine

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY backend/ ./

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start via PM2
CMD ["pm2-runtime", "src/app.js"]
