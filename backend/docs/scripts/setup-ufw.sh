#!/bin/bash
# V20: UFW Firewall Setup for Finanza VPS
# Run as root. This is idempotent - safe to run multiple times.

set -e

echo "=== Setting up UFW firewall ==="

# Reset (careful in production - resets all rules)
# ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# SSH (critical - don't lock yourself out)
ufw allow 22/tcp

# HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp

# Enable if not already active
ufw --force enable

# Deny common attack ports explicitly
ufw deny 3306/tcp   # MySQL - should not be exposed
ufw deny 5432/tcp   # PostgreSQL - docker only
ufw deny 6379/tcp   # Redis - should not be exposed
ufw deny 27017/tcp  # MongoDB - should not be exposed

echo "=== UFW Status ==="
ufw status verbose

echo "=== Done! Firewall configured. ==="