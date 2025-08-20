FROM node:18-alpine

# Install system dependencies for Chromium + Playwright
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ffmpeg \
    git \
    bash \
    wget \
    curl \
    build-base \
    python3 \
    py3-pip

# Tell Playwright to skip its own Chromium download
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies safely
RUN npm install --legacy-peer-deps


# Copy application files
COPY . .

# Create required directories
RUN mkdir -p videos audio

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
