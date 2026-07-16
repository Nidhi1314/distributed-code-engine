FROM python:3.11-alpine
RUN adduser -D -H sandboxuser
USER sandboxuser
WORKDIR /app
