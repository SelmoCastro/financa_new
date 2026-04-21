#!/bin/bash
# V20: UFW Firewall Setup Script for Finanza VPS
# Run ONCE on a new VPS. Requires root/sudo.
set -e

echo "=== Setting up UFW Firewall ==="

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if non-default)
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
sudo ufw --force enable

echo "=== UFW Status ==="
sudo ufw status verbose

echo ""
echo "DONE! Firewall configured."
echo "Allowed ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
echo "All other incoming connections are blocked."