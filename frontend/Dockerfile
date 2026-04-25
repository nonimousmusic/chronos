# Stage 1: Build
FROM node:18-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if we had one, otherwise default is fine for simple SPA
# Recommended for SPA with react-router:
RUN printf "server { \n\
    listen 80; \n\
    location / { \n\
        root /usr/share/nginx/html; \n\
        index index.html; \n\
        try_files \$uri \$uri/ /index.html; \n\
    } \n\
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
