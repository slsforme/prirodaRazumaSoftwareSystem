FROM node:20-alpine AS builder

WORKDIR /app

COPY priroda-razuma/package.json priroda-razuma/package-lock.json ./

RUN npm ci --silent

COPY priroda-razuma/ .

RUN npm run build

FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /var/cache/nginx

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]