#!/usr/bin/env bash
# Enkel kiosk-starter för Chromium på Raspberry Pi
URL="http://localhost:5173"
/usr/bin/chromium-browser \
    --kiosk "$URL" \
    --noerrdialogs \
    --disable-infobars \
    --check-for-update-interval=31536000 \
    --disable-features=Translate,AutofillServerCommunication,TabHoverCards \
    --overscroll-history-navigation=0 \
    --incognito \
    --window-position=0,0 \
    --start-fullscreen \
    --disk-cache-size=1 \
    --disable-application-cache
