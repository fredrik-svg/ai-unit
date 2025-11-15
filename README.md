# Pi Display (MQTT + WebSockets)

Minimal webbaserad display för Raspberry Pi 4/5 i kiosk-läge. Prenumererar på ett MQTT-topic
och renderar inkommande JSON enligt ett enkelt schema.

## Funktion
- Prenumererar: `t/<tenant>/display/<screenId>/render` (QoS 0, konfigurerbart via `topicTemplate`)
- Stöd för olika MQTT-brokers, inklusive **HiveMQ Cloud**
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
   # redigera public/config.json (se nedan för exempel)
   ```
4. Starta i dev-läge:
   ```bash
   npm run dev -- --host
   ```
   Öppna i Chromium: `http://<pi-ip>:5173`

## Konfiguration

### HiveMQ Cloud
För att använda **HiveMQ Cloud**, redigera `public/config.json`:

```json
{
  "screenId": "main",
  "tenant": "GENIO",
  "mqtt": {
    "host": "xxxxxxxx.s1.eu.hivemq.cloud",
    "port": 8884,
    "path": "/mqtt",
    "useTLS": true,
    "username": "din-hivemq-användare",
    "password": "ditt-hivemq-lösenord",
    "clientIdPrefix": "display-"
  },
  "topicTemplate": "t/{tenant}/display/{screenId}/render",
  "debug": false
}
```

**Hitta dina HiveMQ Cloud-inställningar:**
- Logga in på [HiveMQ Cloud Console](https://console.hivemq.cloud/)
- Välj ditt cluster
- Använd **Cluster URL** som `host` (utan `https://`)
- Standardport för WebSocket över TLS: **8884**
- Path: **/mqtt**
- Skapa användare under "Access Management" → "Credentials"

### Anpassa MQTT Topic
Du kan ändra vilket topic displayen lyssnar på genom att redigera `topicTemplate` i `public/config.json`:

**Standard:**
```json
"topicTemplate": "t/{tenant}/display/{screenId}/render"
```

**Exempel på andra topics:**
```json
"topicTemplate": "home/{tenant}/screen/{screenId}"
"topicTemplate": "displays/{screenId}/content"
"topicTemplate": "custom/topic/path"
```

Variabler som kan användas:
- `{tenant}` - ersätts med värdet av `tenant`
- `{screenId}` - ersätts med värdet av `screenId`

### Andra MQTT-brokers
För andra brokers (Mosquitto, EMQX, etc.):
- Ändra `host` till din broker-URL
- Justera `port` (vanliga värden: 8083, 8884, 9001)
- Ändra `path` vid behov (vanligt: `/mqtt` eller `/`)
- Sätt `useTLS: false` för okrypterade anslutningar (ej rekommenderat i produktion)

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
