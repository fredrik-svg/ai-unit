const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');
const wrap = document.getElementById('wrap');
const topicDisplayEl = document.getElementById('topic-display');

async function loadConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('config.json saknas i public/ (kopiera config.example.json)');
    return await res.json();
  } catch (e) {
    statusEl.textContent = 'Fel: ' + e.message;
    throw e;
  }
}

function setStatus(label) {
  statusEl.textContent = label;
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
  const topic = cfg.topicTemplate
    .replace('{tenant}', cfg.tenant)
    .replace('{screenId}', cfg.screenId);

  const cid = (cfg.mqtt.clientIdPrefix || 'display-') + Math.random().toString(16).slice(2);
  const client = new Paho.MQTT.Client(cfg.mqtt.host, Number(cfg.mqtt.port), cfg.mqtt.path || '/mqtt', cid);

  client.onConnectionLost = (resp) => {
    setStatus('Frånkopplad, försöker igen…');
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
        client.subscribe(topic, { qos: 0 });
        log('subscribed: ' + topic);
      },
      onFailure: (e) => {
        setStatus('Kunde inte ansluta');
        log('connect failed: ' + (e?.errorMessage || ''));
      }
    };
    if (cfg.mqtt.username) opts.userName = cfg.mqtt.username;
    if (cfg.mqtt.password) opts.password = cfg.mqtt.password;
    return opts;
  }

  setStatus('Ansluter…');
  client.connect(connectOptions());
  
  // Display the topic on the page
  if (topicDisplayEl) {
    topicDisplayEl.textContent = 'Topic: ' + topic;
  }
  
  return { client, topic };
}

loadConfig().then(cfg => {
  setStatus('Konfiguration laddad');
  connectMqtt(cfg);
}).catch(err => {
  console.error(err);
});
