const statusEl = document.getElementById('status');
const mqttStatusEl = document.getElementById('mqtt-status');
const debugEl = document.getElementById('debug');
const wrap = document.getElementById('wrap');
const topicDisplayEl = document.getElementById('topic-display');
const versionEl = document.getElementById('version');

// Display load time to help users verify they have the latest version
if (versionEl) {
  const buildTime = new Date().toLocaleString('sv-SE', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  });
  versionEl.textContent = `Laddad: ${buildTime}`;
}

function resolveConfigUrl() {
  const base = window.location.href.replace(/[?#].*$/, '');
  // Always resolve config.json relative to the folder the app is served from
  const url = new URL('./config.json', base.endsWith('/') ? base : base + '/');
  return url.href;
}

async function loadConfig() {
  const configUrl = resolveConfigUrl();
  try {
    const res = await fetch(configUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`config.json saknas i public/ (försökte läsa ${configUrl})`);
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`config.json saknas i public/ (försökte läsa ${configUrl})`);
    }
    return await res.json();
  } catch (e) {
    statusEl.textContent = 'Fel: ' + e.message;
    throw e;
  }
}

function setStatus(label) {
  statusEl.textContent = label;
}

function setMqttStatus(label, state = 'pending') {
  if (!mqttStatusEl) return;
  mqttStatusEl.textContent = label;
  mqttStatusEl.classList.remove('pending', 'ok', 'error');
  mqttStatusEl.classList.add(state);
}

function updateTopicDisplay(message) {
  if (!topicDisplayEl) return;
  topicDisplayEl.textContent = message;
}

function log(msg) {
  if (!debugEl) return;
  const time = new Date().toLocaleTimeString();
  debugEl.textContent = `[${time}] ${msg}\n` + debugEl.textContent;
}

function render(data) {
  if (data.view === 'cards') {
    wrap.innerHTML = data.items.map(it => `
      <div class="card">
        <h3>${it.title || 'Svar'}</h3>
        <p>${it.body || ''}</p>
      </div>
    `).join('');
    return;
  }
  // Fallback to raw JSON
  wrap.innerHTML = `<div class="card"><h3>Payload</h3><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
}

function connectMqtt(cfg) {
  // Validate required config values
  if (!cfg.tenant || cfg.tenant.trim() === '') {
    const err = 'Fel: tenant saknas eller är tom i konfigurationen';
    setStatus(err);
    log(err);
    throw new Error(err);
  }
  if (!cfg.screenId || cfg.screenId.trim() === '') {
    const err = 'Fel: screenId saknas eller är tom i konfigurationen';
    setStatus(err);
    log(err);
    throw new Error(err);
  }

  const template = (cfg.topicTemplate || '').trim();
  if (!template) {
    const err = 'Fel: topicTemplate saknas i konfigurationen';
    setStatus(err);
    updateTopicDisplay('Topic saknas i config.json');
    log(err);
    throw new Error(err);
  }

  const topic = template
    .replace('{tenant}', cfg.tenant)
    .replace('{screenId}', cfg.screenId);

  // Display the topic immediately so users can see what the app is trying to subscribe to
  updateTopicDisplay('Topic: ' + topic);
  
  // Validate that all placeholders were replaced
  if (topic.includes('{') || topic.includes('}')) {
    const err = 'Fel: Topic-mallen innehåller ej ersatta platshållare: ' + topic;
    setStatus(err);
    log(err);
    throw new Error(err);
  }
  
  // Validate topic doesn't contain MQTT wildcard characters
  if (topic.includes('+') || topic.includes('#')) {
    const err = 'Fel: Topic innehåller ogiltiga MQTT-tecken (+, #): ' + topic;
    setStatus(err);
    log(err);
    throw new Error(err);
  }

  // Clean and validate MQTT host (remove protocol prefixes and any accidental path)
  let mqttHost = cfg.mqtt.host || '';
  mqttHost = mqttHost
    .replace(/^(https?:\/\/|wss?:\/\/)/i, '')
    .split(/[/?#]/)[0]
    .trim();
  
  if (!mqttHost) {
    const err = 'Fel: MQTT host saknas i konfigurationen';
    setStatus(err);
    log(err);
    throw new Error(err);
  }
  
  // Generate a valid MQTT client ID (alphanumeric only, no special chars)
  const randomId = Math.random().toString(36).substring(2, 15);
  const cid = (cfg.mqtt.clientIdPrefix || 'display') + randomId;
  
  let client;
  try {
    client = new Paho.MQTT.Client(mqttHost, Number(cfg.mqtt.port), cfg.mqtt.path || '/mqtt', cid);
  } catch (e) {
    const err = 'Fel vid skapande av MQTT-klient: ' + e.message + 
                '\nKontrollera att host (' + mqttHost + '), port och path är korrekta i config.json';
    setStatus('Konfigurationsfel');
    log(err);
    throw new Error(err);
  }

  client.onConnectionLost = (resp) => {
    setStatus('Frånkopplad, försöker igen…');
    setMqttStatus('MQTT: Frånkopplad – försöker igen…', 'error');
    log('connection lost: ' + (resp?.errorMessage || 'okänt'));
    setTimeout(() => client.connect(connectOptions()), 1500);
  };

  client.onMessageArrived = (m) => {
    try {
      const data = JSON.parse(m.payloadString);
      if (cfg.debug) log('message: ' + m.payloadString);
      render(data);
    } catch (e) {
      log('parse error: ' + e.message);
    }
  };

  function connectOptions() {
    const opts = {
      timeout: 5,
      useSSL: !!cfg.mqtt.useTLS,
      onSuccess: () => {
        setStatus('Ansluten');
        setMqttStatus('MQTT: Ansluten', 'ok');
        client.subscribe(topic, { qos: 0 });
        log('subscribed: ' + topic);
      },
      onFailure: (e) => {
        setStatus('Kunde inte ansluta');
        setMqttStatus('MQTT: Kunde inte ansluta', 'error');
        log('connect failed: ' + (e?.errorMessage || ''));
      }
    };
    if (cfg.mqtt.username) opts.userName = cfg.mqtt.username;
    if (cfg.mqtt.password) opts.password = cfg.mqtt.password;
    return opts;
  }

  setStatus('Ansluter…');
  setMqttStatus('MQTT: Ansluter…', 'pending');
  client.connect(connectOptions());

  return { client, topic };
}

loadConfig().then(cfg => {
  setStatus('Konfiguration laddad');
  setMqttStatus('MQTT: Förbereder anslutning…', 'pending');
  connectMqtt(cfg);
}).catch(err => {
  console.error(err);
  // Show the actual error message instead of a generic one
  const errorMsg = err.message || 'Kunde inte läsa config';
  setMqttStatus('MQTT: ' + errorMsg, 'error');
});
