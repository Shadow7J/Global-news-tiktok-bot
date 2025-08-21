# Use Debian-based Node image for Playwright compatibility (Alpine/musl is not supported)
FROM node:18-bookworm

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (without dev dependencies)
RUN npm install --omit=dev

# Install Playwright browsers and system dependencies
RUN npx playwright install --with-deps chromium

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
