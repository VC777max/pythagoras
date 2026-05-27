FROM node:20-bullseye

# Install build dependencies for better-sqlite3 C++ compilation
# and system libraries required to run headless Chromium
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    wget \
    gnupg \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnss3 \
    libxss1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (better-sqlite3 will build from source)
RUN npm install

# Install Playwright and its Chromium dependencies
RUN npx playwright install --with-deps chromium

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
