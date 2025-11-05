# Pi Display (MQTT + WebSockets)

Minimal webbaserad display för Raspberry Pi 4/5 i kiosk-läge. Prenumererar på ett MQTT-topic
och renderar inkommande JSON enligt ett enkelt schema.

## Funktion
- Prenumererar: `t/<tenant>/display/<screenId>/render` (QoS 0)
- Payload-format (exempel):
  ```json
  { "view": "cards", "items": [ { "title": "Svar", "body": "Hej världen" } ] }
  ```

## Kom igång (snabbtest)
1. Installera Node 18+ på din Pi.
2. Klona repot och installera dependenser:
   ```bash
   npm install
   ```
3. Kopiera exempelkonfig och fyll i dina broker-uppgifter:
   ```bash
   cp public/config.example.json public/config.json
   # redigera public/config.json (host, port, username, password, tenant, screenId)
   ```
4. Starta i dev-läge:
   ```bash
   npm run dev -- --host
   ```
   Öppna i Chromium: `http://<pi-ip>:5173`

## Produktion (bygg & kör)
```bash
npm run build
npm run preview -- --host
# servern lyssnar på port 5173
```

> OBS: Använd **wss** (TLS) och kortlivade **JWT** eller mTLS i produktion.
> Exemplet använder användarnamn/lösen endast för labb.

## Kiosk-läge på Raspberry Pi (Chromium)
Installera Chromium och skapa en systemd-tjänst som öppnar sidan i kiosk-läge.

```bash
sudo apt-get update && sudo apt-get install -y chromium-browser
```

Redigera `scripts/kiosk.sh` (URL om du kör på annan port/ip) och gör körbar:
```bash
chmod +x scripts/kiosk.sh
```

Kopiera systemd-tjänsten och enable:
```bash
sudo cp systemd/pi-display-kiosk.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-display-kiosk
sudo systemctl start pi-display-kiosk
```

## Säkerhet
- Kör över **WSS** och sätt `useTLS: true` i `public/config.json`.
- Använd kortlivad **MQTT-JWT** eller **mTLS** istället för statiska lösenord.
- Lås ACL i din broker så att displayen *endast* kan läsa sitt topic.

## Licens
MIT
