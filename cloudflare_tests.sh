#!/bin/bash

# --- CONFIGURE ---
DOMAIN="ai.tupinymquim.com"
TEST_URL="https://$DOMAIN"
TEST_ASSET_URL="$TEST_URL" # pode mudar para algum .css ou .png se preferir

# --- COLORS ---
NC='\033[0m'
BOLD='\033[1;37m'
BLUE='\033[1;34m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'

echo -e "${BOLD}${BLUE}Cloudflare/Server Test Battery for $DOMAIN${NC}"
echo "------------------------------------------------------"

# 1. Ping Test
echo -e "\n${BOLD}${GREEN}1. Ping test:${NC}"
ping -c 4 $DOMAIN

# 2. Traceroute
echo -e "\n${BOLD}${GREEN}2. Traceroute:${NC}"
if command -v traceroute >/dev/null 2>&1; then
    traceroute $DOMAIN
else
    echo "traceroute not found, trying 'tracert' (Windows):"
    tracert $DOMAIN
fi

# 3. HTTP Headers / Cloudflare status
echo -e "\n${BOLD}${GREEN}3. HTTP Headers (Cache status, etc):${NC}"
curl -sI $TEST_URL | grep -Ei 'HTTP/|cf-|server:|cache|date'

# 4. Cloudflare Cache Test (HIT/MISS)
echo -e "\n${BOLD}${GREEN}4. Cache test (second request should be HIT):${NC}"
curl -sI $TEST_ASSET_URL | grep -Ei 'cf-cache-status|date'
sleep 1
curl -sI $TEST_ASSET_URL | grep -Ei 'cf-cache-status|date'

# 5. Stress test: 100 requests (Apache Benchmark)
if command -v ab >/dev/null 2>&1; then
    echo -e "\n${BOLD}${GREEN}5. Stress test (100 requests, 10 concurrent):${NC}"
    ab -n 100 -c 10 $TEST_URL/
else
    echo -e "${YELLOW}ab (Apache Benchmark) not installed.${NC}"
    echo "To install: sudo apt-get install apache2-utils"
fi

echo -e "\n${BOLD}${BLUE}All tests completed!${NC}"
