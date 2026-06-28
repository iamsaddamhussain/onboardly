# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first (better layer caching)
COPY client/package.json client/yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build the static bundle
COPY client/ ./
RUN yarn build

# Serve with nginx
FROM nginx:alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
