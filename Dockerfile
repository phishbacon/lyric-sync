FROM node:slim

RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN mv .env.example .env
RUN pnpm build

ENV ORIGIN=http://localhost:3000

EXPOSE 3000
CMD ["node", "build"]
