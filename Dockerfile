# Stage 1: Builder (Ubuntu)
FROM ubuntu:22.04 AS builder

# Install dependencies
RUN apt-get update && apt-get install -y curl unzip git

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH
ENV PATH="/root/.bun/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy lock and package files
COPY bun.lock package.json ./


# Install dependencies using Bun
RUN bun install

# Copy source files
COPY . .


# Build the app
RUN bun run build


# Stage 2: Runtime with Node 20 Alpine
FROM node:20-bullseye AS runner
WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./

RUN npm pkg delete devDependencies
RUN npm install --omit=dev

# Copy only compiled output
COPY --from=builder /app/dist ./dist


CMD ["node", "dist/src/main.js"]