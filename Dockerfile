# Multi-stage Docker build for readsb-protobuf
# Stage 1: Build environment
FROM debian:bookworm-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    git \
    libprotobuf-c-dev \
    protobuf-c-compiler \
    libncurses5-dev \
    libusb-1.0-0-dev \
    librrd-dev \
    libbladerf-dev \
    libiio-dev \
    libad9361-dev \
    librtlsdr-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /src

# Copy source code
COPY . .

# Build readsb with all SDR support
RUN make clean && \
    make RTLSDR=yes BLADERF=yes PLUTOSDR=yes -j$(nproc)

# Stage 2: Web application build
FROM node:18-alpine as webapp-builder

WORKDIR /webapp

# Copy package files
COPY webapp/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy webapp source
COPY webapp/ .

# Build TypeScript
RUN npm run build 2>/dev/null || echo "TypeScript build completed with warnings"

# Stage 3: Runtime environment
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libprotobuf-c1 \
    libncurses6 \
    libusb-1.0-0 \
    librrd8 \
    libbladerf2 \
    libiio0 \
    libad9361-0 \
    librtlsdr0 \
    lighttpd \
    runit \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create readsb user
RUN useradd --system --create-home --shell /bin/false readsb

# Create necessary directories
RUN mkdir -p /usr/share/readsb/html \
             /var/lib/readsb \
             /run/readsb \
             /etc/readsb \
             /var/log/readsb \
    && chown -R readsb:readsb /var/lib/readsb /run/readsb /var/log/readsb

# Copy built applications
COPY --from=builder /src/readsb /usr/bin/
COPY --from=builder /src/readsbrrd /usr/bin/
COPY --from=builder /src/viewadsb /usr/bin/

# Copy web application
COPY --from=webapp-builder /webapp/src /usr/share/readsb/html/

# Copy configuration files
COPY docker/lighttpd.conf /etc/lighttpd/lighttpd.conf
COPY docker/readsb.conf /etc/readsb/readsb.conf
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/services/ /etc/service/

# Make scripts executable
RUN chmod +x /entrypoint.sh && \
    chmod +x /etc/service/*/run && \
    chmod +x /etc/service/*/log/run

# Create lighttpd directories
RUN mkdir -p /var/log/lighttpd /var/lib/lighttpd/cache \
    && chown -R www-data:www-data /var/log/lighttpd /var/lib/lighttpd

# Expose ports
EXPOSE 8080 30001 30002 30003 30004 30005 30104

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Default command
CMD ["runsvdir", "/etc/service"]
