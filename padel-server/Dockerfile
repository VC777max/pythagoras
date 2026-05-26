FROM node:20-bullseye

# Install build dependencies for better-sqlite3 C++ compilation
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (better-sqlite3 will build from source)
RUN npm install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
