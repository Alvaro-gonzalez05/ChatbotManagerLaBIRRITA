#!/bin/bash

# Cleanup script for conversation contexts
# Runs every 20 minutes to clean expired conversation contexts

echo "$(date): Starting conversation context cleanup..."

# Call the cleanup endpoint
curl -X POST http://localhost:3000/api/admin/cleanup-conversation-context \
  -H "Content-Type: application/json" \
  -s

echo "$(date): Cleanup completed"