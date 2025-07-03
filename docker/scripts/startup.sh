#!/bin/bash

set -e

# Configuration variables
READSB_DEVICE="${READSB_DEVICE:-auto}"
READSB_GAIN="${READSB_GAIN:-autogain}"
READSB_LAT="${READSB_LAT:-40.7128}"
READSB_LON="${READSB_LON:--74.0060}"
READSB_MAX_RANGE="${READSB_MAX_RANGE:-450}"
READSB_STATS_RANGE="${READSB_STATS_RANGE:-60}"
READSB_NET_HEARTBEAT="${READSB_NET_HEARTBEAT:-60}"
READSB_NET_RO_SIZE="${READSB_NET_RO_SIZE:-1280}"
READSB_NET_RO_INTERVAL="${READSB_NET_RO_INTERVAL:-0.05}"
READSB_NET_RO_PORT="${READSB_NET_RO_PORT:-30002}"
READSB_NET_BI_PORT="${READSB_NET_BI_PORT:-30004}"
READSB_NET_BO_PORT="${READSB_NET_BO_PORT:-30005}"
READSB_NET_SBS_PORT="${READSB_NET_SBS_PORT:-30003}"
READSB_WRITE_JSON="${READSB_WRITE_JSON:-2}"
READSB_JSON_LOCATION_ACCURACY="${READSB_JSON_LOCATION_ACCURACY:-2}"

echo "Starting readsb-protobuf container..."
echo "Configuration:"
echo "  Device: $READSB_DEVICE"
echo "  Gain: $READSB_GAIN"
echo "  Location: $READSB_LAT, $READSB_LON"
echo "  Max Range: $READSB_MAX_RANGE nm"

# Create necessary directories
mkdir -p /run/readsb
mkdir -p /var/cache/lighttpd/uploads
mkdir -p /var/log/lighttpd

# Set permissions
chown -R www-data:www-data /var/cache/lighttpd
chown -R www-data:www-data /var/log/lighttpd
chown -R readsb:readsb /run/readsb

# Function to start lighttpd
start_lighttpd() {
    echo "Starting lighttpd web server..."
    lighttpd -f /etc/lighttpd/lighttpd.conf -D &
    LIGHTTPD_PID=$!
    echo "Lighttpd started with PID: $LIGHTTPD_PID"
}

# Function to start readsb
start_readsb() {
    echo "Starting readsb with device: $READSB_DEVICE"
    
    # Base command
    READSB_CMD="/usr/local/bin/readsb \
        --device-type=rtlsdr \
        --device=$READSB_DEVICE \
        --gain=$READSB_GAIN \
        --lat=$READSB_LAT \
        --lon=$READSB_LON \
        --max-range=$READSB_MAX_RANGE \
        --stats-range=$READSB_STATS_RANGE \
        --net \
        --net-heartbeat=$READSB_NET_HEARTBEAT \
        --net-ro-size=$READSB_NET_RO_SIZE \
        --net-ro-interval=$READSB_NET_RO_INTERVAL \
        --net-ro-port=$READSB_NET_RO_PORT \
        --net-bi-port=$READSB_NET_BI_PORT \
        --net-bo-port=$READSB_NET_BO_PORT \
        --net-sbs-port=$READSB_NET_SBS_PORT \
        --write-json=/run/readsb \
        --write-json-every=$READSB_WRITE_JSON \
        --json-location-accuracy=$READSB_JSON_LOCATION_ACCURACY \
        --quiet"

    # Add additional options if specified
    if [ ! -z "$READSB_EXTRA_ARGS" ]; then
        READSB_CMD="$READSB_CMD $READSB_EXTRA_ARGS"
    fi

    echo "Running: $READSB_CMD"
    exec $READSB_CMD &
    READSB_PID=$!
    echo "Readsb started with PID: $READSB_PID"
}

# Function to cleanup on exit
cleanup() {
    echo "Received signal, shutting down services..."
    if [ ! -z "$READSB_PID" ]; then
        echo "Stopping readsb (PID: $READSB_PID)..."
        kill -TERM $READSB_PID 2>/dev/null || true
        wait $READSB_PID 2>/dev/null || true
    fi
    if [ ! -z "$LIGHTTPD_PID" ]; then
        echo "Stopping lighttpd (PID: $LIGHTTPD_PID)..."
        kill -TERM $LIGHTTPD_PID 2>/dev/null || true
        wait $LIGHTTPD_PID 2>/dev/null || true
    fi
    echo "Services stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Health check function
health_check() {
    # Check if readsb is running and producing data
    if [ -f "/run/readsb/aircraft.json" ]; then
        # Check if the file was updated recently (within last 10 seconds)
        if [ $(find /run/readsb/aircraft.json -mtime -10s | wc -l) -gt 0 ]; then
            return 0
        fi
    fi
    return 1
}

# Wait for RTL-SDR device if specified
if [ "$READSB_DEVICE" != "auto" ] && [ "$READSB_DEVICE" != "none" ]; then
    echo "Waiting for RTL-SDR device: $READSB_DEVICE"
    timeout=30
    while [ $timeout -gt 0 ]; do
        if rtl_test -d "$READSB_DEVICE" -t 1 >/dev/null 2>&1; then
            echo "RTL-SDR device found: $READSB_DEVICE"
            break
        fi
        echo "Waiting for device... ($timeout seconds remaining)"
        sleep 1
        timeout=$((timeout - 1))
    done
    
    if [ $timeout -eq 0 ]; then
        echo "WARNING: RTL-SDR device not found after 30 seconds. Continuing anyway..."
    fi
fi

# Start services
start_lighttpd
sleep 2
start_readsb

echo "All services started. Container is ready."
echo "Web interface available at: http://localhost:8080"
echo "Raw data ports:"
echo "  - Beast output: $READSB_NET_BO_PORT"
echo "  - Beast input: $READSB_NET_BI_PORT"
echo "  - Raw output: $READSB_NET_RO_PORT"
echo "  - SBS output: $READSB_NET_SBS_PORT"

# Keep the container running and monitor processes
while true; do
    sleep 30
    
    # Check if lighttpd is still running
    if ! kill -0 $LIGHTTPD_PID 2>/dev/null; then
        echo "ERROR: Lighttpd process died. Restarting..."
        start_lighttpd
    fi
    
    # Check if readsb is still running
    if ! kill -0 $READSB_PID 2>/dev/null; then
        echo "ERROR: Readsb process died. Restarting..."
        start_readsb
    fi
    
    # Perform health check
    if ! health_check; then
        echo "WARNING: Health check failed - no recent aircraft data"
    fi
done
