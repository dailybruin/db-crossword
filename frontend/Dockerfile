# Stage 1: Build
FROM node:24 AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
COPY .env .

# Accept BACKEND_DOMAIN as a build argument
ARG VITE_BACKEND_DOMAIN
ENV VITE_BACKEND_DOMAIN=$VITE_BACKEND_DOMAIN

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
