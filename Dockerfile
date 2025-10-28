FROM node:22.16.0-alpine3.22 AS base

# FFmpeg build stage
FROM alpine:3.22 AS ffmpeg-build
RUN apk add --no-cache \
    build-base \
    nasm \
    pkgconf \
    x264-dev \
    wget

RUN wget https://ffmpeg.org/releases/ffmpeg-7.1.2.tar.bz2 && \
    tar xf ffmpeg-7.1.2.tar.bz2 && \
    cd ffmpeg-7.1.2 && \
    ./configure \
        --prefix=/usr/local \
        --disable-debug \
        --disable-doc \
        --enable-gpl \
        --enable-libx264 && \
    make -j$(nproc) && \
    make install

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN node ace build --ignore-ts-errors

# Production stage
FROM base
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache netcat-openbsd
COPY --from=ffmpeg-build /usr/lib/libx264.so* /usr/lib/
COPY --from=ffmpeg-build /usr/local/bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg-build /usr/local/bin/ffprobe /usr/local/bin/ffprobe
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 3333
ENTRYPOINT ["/docker-entrypoint.sh"]
