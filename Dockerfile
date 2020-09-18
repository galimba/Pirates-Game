FROM node:10.22.1-alpine3.11
WORKDIR /app
COPY . .
RUN npm install --quiet

