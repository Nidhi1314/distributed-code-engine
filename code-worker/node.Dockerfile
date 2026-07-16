FROM node:20-alpine
RUN adduser -D -H sandboxuser
USER sandboxuser
WORKDIR /app
