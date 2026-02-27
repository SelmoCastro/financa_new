---
name: antigravity-pulse
description: monitoring and managing AI model quota pools (Gemini, Claude, GPT) in real-time. Use it when the user asks about usage limits, quota resets, or available credits.
source: "https://github.com/codavidgarcia/antigravity-pulse.git"
---

# Antigravity Pulse

## Overview
Antigravity Pulse allows the agent to monitor its own AI model quota pools (Gemini, Claude/GPT, and Flash) by communicating with the local IDE server. It provides visibility into remaining percentages, time until reset, and per-pool status icons.

## When to Use This Skill
- When the user asks "How much quota do I have left?"
- When checking if a specific model (like Claude 4.5) is close to its limit.
- When troubleshooting why an AI feature might be failing (to rule out exhaustion).
- When planning intensive AI tasks that might require significant quota.

## Key Functions
1. **Fetch Quota**: Retrieves a snapshot of all model pools and their current health.
2. **Pool Detection**: Automatically groups models into their respective quota buckets (e.g., Gemini Pro vs. Gemini Flash).
3. **Reset Monitoring**: Tracks how long until each pool's quota is refreshed.

## How it Works
This skill scans for the local Antigravity `language_server` process, extracts local API connection parameters, and makes a POST request to `/GetUserStatus`.

## Usage
Simply ask "Check my quota status" or "Pulse check" to see a formatted breakdown of your available AI resources.
