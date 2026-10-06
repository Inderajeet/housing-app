import http from 'node:http';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = pkg;

const PORT = process.env.PORT || 3001;
const SECRET = process.env.GATEWAY_SECRET || '';

let ready = false;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', (qr) => {
  console.log('Scan this QR with the sender WhatsApp (Linked devices):');
  qrcode.generate(qr, { small: true });
});
client.on('ready', () => { ready = true; console.log('WhatsApp ready'); });
client.on('disconnected', (reason) => { ready = false; console.log('Disconnected:', reason); });
client.initialize();

// "to" is a 10 digit number or a group id ending in @g.us
const toChatId = (to) => {
  const s = String(to);
  if (s.endsWith('@g.us') || s.endsWith('@c.us')) return s;
  const digits = s.replace(/\D/g, '');
  return `${digits.length === 10 ? '91' : ''}${digits}@c.us`;
};

const server = http.createServer((req, res) => {
  const reply = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  if (req.method !== 'POST' || req.url !== '/send') return reply(404, { error: 'not found' });
  if (SECRET && req.headers['x-gateway-secret'] !== SECRET) return reply(401, { error: 'unauthorized' });
  if (!ready) return reply(503, { error: 'whatsapp not ready' });

  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', async () => {
    try {
      const { to, message } = JSON.parse(raw);
      if (!to || !message) return reply(400, { error: 'to and message required' });
      await client.sendMessage(toChatId(to), message);
      reply(200, { success: true });
    } catch (err) {
      reply(500, { error: err.message });
    }
  });
});

server.listen(PORT, () => console.log(`Gateway listening on ${PORT}`));
