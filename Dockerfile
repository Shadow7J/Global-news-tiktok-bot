# Use Microsoft’s official Playwright image (includes Node + Chromium/Firefox/WebKit + deps)
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies (skip browser download since already inside image)
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy the rest of your project
COPY . .

# Expose port if your app has a server (e.g., 3000)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
