# Build the React application.
FROM node:22-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build the dependency-free Go service.
FROM golang:1.26-alpine AS backend
WORKDIR /build/backend
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /calculator ./cmd/server

# Serve both layers from one origin as an unprivileged user.
FROM alpine:3.23
RUN addgroup -S calculator && adduser -S -G calculator calculator
WORKDIR /app
COPY --from=backend /calculator /app/calculator
COPY --from=frontend /build/frontend/dist /app/public
USER calculator
EXPOSE 8080
ENTRYPOINT ["/app/calculator", "-addr", ":8080", "-static-dir", "/app/public"]
