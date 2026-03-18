FROM node:20-alpine AS build

RUN apk add --no-cache python3 make g++ ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json vitest.config.ts ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN mkdir -p /app/data

CMD ["node", "dist/index.js"]
