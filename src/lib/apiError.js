export function toApiError(error) {
  const message = error?.message || 'Unknown error';
  const code = error?.code;

  const nestedCode =
    error?.cause?.code ||
    error?.original?.code ||
    error?.meta?.code ||
    error?.meta?.cause?.code;

  const prismaCode =
    code?.toString?.() ||
    nestedCode?.toString?.() ||
    error?.errorCode?.toString?.();

  const nestedMessage =
    error?.cause?.message ||
    error?.original?.message ||
    error?.meta?.cause ||
    error?.meta?.message;

  const isNetworkish =
    prismaCode === 'P1001' || // Prisma: can't reach DB server
    prismaCode === 'P1002' || // Prisma: connection timed out
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENETUNREACH' ||
    code === 'ENOTFOUND' ||
    /can't reach database server/i.test(message) ||
    /can't reach database server/i.test(String(nestedMessage || '')) ||
    /timeout expired/i.test(message) ||
    /timeout expired/i.test(String(nestedMessage || '')) ||
    /connect(ion)?\s+(timed out|timeout|refused|failed)/i.test(message) ||
    /connect(ion)?\s+(timed out|timeout|refused|failed)/i.test(String(nestedMessage || '')) ||
    /(ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ENOTFOUND)/i.test(message) ||
    /(ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ENOTFOUND)/i.test(String(nestedMessage || ''));

  if (isNetworkish) {
    return {
      status: 503,
      body: {
        error:
          'Database/API connection failed. Check DATABASE_URL network access (VPN/firewall) or configure NEXT_PUBLIC_ADMIN_API_URL to a reachable backend.',
        details: nestedMessage ? `${message} | ${nestedMessage}` : message,
      },
    };
  }

  return { status: 500, body: { error: message } };
}
