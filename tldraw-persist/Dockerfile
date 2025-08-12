FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY package.json /app/
RUN npm install --only=production
COPY server.js /app/
ENV PORT=8080 TZ=America/New_York
EXPOSE 8080
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","server.js"]
