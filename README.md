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
    "clientIdPrefix": "display"
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

### Cache-hantering i produktion
För att säkerställa att användare alltid får den senaste versionen efter `git pull` och ombyggnad:

**Nginx-konfiguration:**
```nginx
location / {
    root /path/to/dist;
    try_files $uri $uri/ /index.html;
    
    # Ingen cache för HTML-filer
    location ~* \.html$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Aggressiv cache för hashed assets (JS, CSS)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

**Apache (.htaccess):**
```apache
# Ingen cache för HTML
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
</FilesMatch>

# Aggressiv cache för hashed assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
```

**Verifiering:**
- Kontrollera tidsstämpeln längst ner på sidan för att se när frontend laddades
- Använd hårduppdatering i webbläsaren (Ctrl+Shift+R / Cmd+Shift+R) för att tvinga omladdning

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

## Felsökning

### Ser ingen skillnad efter git pull
Om du har kört `git pull` och rebuildat men inte ser ändringar i webbläsaren:

1. **Hårduppdatera webbläsaren:** Tryck Ctrl+Shift+R (Windows/Linux) eller Cmd+Shift+R (Mac)
2. **Kontrollera tidsstämpel:** Titta på tidsstämpeln längst ner på sidan - den ska visa när sidan senast laddades
3. **Rensa cache:** Öppna DevTools (F12) → Application/Storage → Clear storage → Clear site data
4. **Verifiera build:** Kör `npm run build` igen och kontrollera att nya filer skapas i `dist/`
5. **Starta om servern:** Om du kör `npm run preview`, stoppa och starta om den

### MQTT ansluter inte
- Kontrollera att broker-uppgifterna i `public/config.json` stämmer
- Öppna browser DevTools (F12) och titta i Console för felmeddelanden
- Verifiera att `host`, `port` och `path` är korrekta för din broker
- Se till att topic-mallen inte innehåller ogiltiga tecken eller tomma värden

## Licens
MIT
