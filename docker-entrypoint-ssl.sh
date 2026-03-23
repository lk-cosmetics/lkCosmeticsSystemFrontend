#!/bin/sh
set -e

CERT_DIR="/etc/nginx/ssl"
CERT_FILE="$CERT_DIR/selfsigned.crt"
KEY_FILE="$CERT_DIR/selfsigned.key"

# Generate self-signed certificate if not already present (persisted via volume)
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "🔐 Generating self-signed SSL certificate for LAN access..."
  mkdir -p "$CERT_DIR"
  # Get the container's IP and common LAN IPs for the SAN field
  LOCAL_IP=$(hostname -i 2>/dev/null | awk '{print $1}' || echo "")

  openssl req -x509 -nodes -days 3650 \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=TN/ST=Local/L=Local/O=LKSystem/CN=lksystem.local" \
    -addext "subjectAltName=DNS:localhost,DNS:*.local,IP:127.0.0.1,IP:192.168.8.170,IP:192.168.1.252,IP:192.168.1.1,IP:10.0.0.1${LOCAL_IP:+,IP:$LOCAL_IP}"
  echo "✅ SSL certificate generated (valid for 10 years)"
fi

# Run the default nginx docker-entrypoint (handles envsubst for templates)
exec /docker-entrypoint.sh "$@"
