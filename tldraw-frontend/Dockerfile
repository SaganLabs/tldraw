# Build the monorepo & patch the example app
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git bash libc6-compat python3 make g++ curl

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 YARN_ENABLE_IMMUTABLE_INSTALLS=true
ARG TL_REPO="https://github.com/tldraw/tldraw.git"
ARG TL_REF="main"

# Clone and setup tldraw repo
RUN git clone --depth=1 --branch "${TL_REF}" "${TL_REPO}" .
RUN corepack enable && corepack prepare yarn@stable --activate
RUN yarn install --immutable

# --- REPLACE the Next.js example BEFORE building ---
# NOTE: The actual workspace is at /app/templates/nextjs/, not /app/apps/tldraw-nextjs-app-example/
RUN rm -rf /app/templates/nextjs/app
RUN rm -rf /app/templates/nextjs/pages

# Create proper app directory structure
RUN mkdir -p /app/templates/nextjs/app/board/[id]
RUN mkdir -p /app/templates/nextjs/app/b/[id]

# Copy your custom files to the CORRECT location
COPY app/ /app/templates/nextjs/app/

# Copy branding assets to the CORRECT location
COPY brand/free-spirit.png /app/templates/nextjs/public/logo.png
COPY brand/free-spirit.ico /app/templates/nextjs/public/favicon.ico

# Override package.json metadata if you have a custom one
# COPY package.json /app/apps/tldraw-nextjs-app-example/package.json

# Force clean build of the modified Next.js app at the CORRECT location
RUN cd /app/templates/nextjs && rm -rf .next && rm -rf node_modules/.cache

# Build the entire monorepo WITH your custom files
RUN yarn workspaces foreach -A --topological-dev -v run build

# ---- Runtime image ----
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app /app
RUN corepack enable && corepack prepare yarn@stable --activate
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
EXPOSE 3000
CMD ["yarn","workspace","tldraw-nextjs-app-example","next","start","-p","3000","-H","0.0.0.0"]