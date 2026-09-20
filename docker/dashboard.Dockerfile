# Contexte de build : racine du dépôt
FROM node:22-alpine AS build
WORKDIR /app
COPY dashboard-react/package*.json ./
RUN npm ci
COPY dashboard-react/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
