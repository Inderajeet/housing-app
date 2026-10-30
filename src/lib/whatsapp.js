// WhatsApp Cloud API (Meta) sender, falls back to the old gateway if Cloud API env is not set
const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

// Meta wants country code + digits only, no "+"
function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

async function sendViaCloudApi(phone, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

  // Business-initiated messages must use an approved template. Template body has one variable {{1}}
  const body = template
    ? {
        messaging_product: 'whatsapp',
        to: normalizePhone(phone),
        type: 'template',
        template: {
          name: template,
          language: { code: lang },
          components: template === 'hello_world'
            ? []
            : [{ type: 'body', parameters: [{ type: 'text', text: message.replace(/\s*\n+\s*/g, ' ') }] }],
        },
      }
    : {
        // Free text only delivers inside the 24h customer window
        messaging_product: 'whatsapp',
        to: normalizePhone(phone),
        type: 'text',
        text: { body: message },
      };

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error('whatsapp cloud api failed', res.status, await res.text());
}

async function sendViaGateway(phone, message) {
  const res = await fetch(`${process.env.WHATSAPP_GATEWAY_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-gateway-secret': process.env.GATEWAY_SECRET || '' },
    body: JSON.stringify({ to: phone, message }),
  });
  if (!res.ok) console.error('whatsapp send failed', res.status, await res.text());
}

export async function sendWhatsApp(phone, message) {
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) return sendViaCloudApi(phone, message);
  if (process.env.WHATSAPP_GATEWAY_URL) return sendViaGateway(phone, message);
  console.log(`[whatsapp not configured] to ${phone}: ${message}`);
}
