const LOCAL_PRINT_AGENT_URL =
  process.env.REACT_APP_LOCAL_PRINT_AGENT_URL || 'http://127.0.0.1:31991';

function fetchOptions(options = {}) {
  return {
    ...options,
    // Chrome uses this hint for Local Network Access when supported.
    targetAddressSpace: 'local',
  };
}

async function localFetch(path, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(
      `${LOCAL_PRINT_AGENT_URL}${path}`,
      fetchOptions({ ...options, signal: controller.signal }),
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function localAgentError(error) {
  if (error?.name === 'AbortError') {
    return new Error('The local Zebra print agent did not respond. Start the Gen8 Zebra Print Agent on this computer and try again.');
  }
  return new Error(
    'Local Zebra printing is not available on this computer. Start the Gen8 Zebra Print Agent and confirm the Zebra printer is installed in Windows.',
  );
}

export async function getLocalZebraStatus() {
  try {
    const response = await localFetch('/health', { method: 'GET' }, 3000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || 'Local print agent is not ready.');
    }
    return data;
  } catch (error) {
    throw localAgentError(error);
  }
}

export async function printLocalZebraJobs(serverPayload) {
  const jobs = Array.isArray(serverPayload?.jobs)
    ? serverPayload.jobs.filter((job) => typeof job?.zpl === 'string' && job.zpl.length)
    : [];

  if (!jobs.length) {
    if (Number(serverPayload?.count || 0) === 0) return { ok: true, count: 0 };
    throw new Error('The server did not return any printable ZPL jobs.');
  }

  let lastResult = null;
  try {
    await getLocalZebraStatus();
    for (const job of jobs) {
      const response = await localFetch(
        '/print',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zpl: job.zpl }),
        },
        15000,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'The local Zebra print job failed.');
      }
      lastResult = data;
    }
  } catch (error) {
    if (error?.message?.startsWith('The local Zebra print job failed') || error?.message?.includes('printer')) {
      throw error;
    }
    throw localAgentError(error);
  }

  return {
    ok: true,
    count: Number(serverPayload?.count || 0),
    printer_name: lastResult?.printer_name || null,
  };
}

export { LOCAL_PRINT_AGENT_URL };
