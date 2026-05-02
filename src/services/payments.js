const PAYMENT_API_BASE_URL = "https://real-barbers-paymongo-api.vercel.app/api";
const PAYMENT_REQUEST_TIMEOUT_MS = 20000;

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    PAYMENT_REQUEST_TIMEOUT_MS,
  );

  try {
    return await fetch(`${PAYMENT_API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "QR generation is taking too long. Please try again in a moment.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getPaymentErrorMessage(data = {}) {
  const details =
    typeof data.details === "string"
      ? data.details
      : data.details?.errors?.[0]?.detail ||
        data.details?.errors?.[0]?.title ||
        "";

  return details || data.error || "Failed to create payment";
}

export async function requestQrPayment(payload) {
  const res = await fetchWithTimeout("/create-qrph-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(getPaymentErrorMessage(data));
  }

  return data;
}

export async function cancelQrPayment(appointmentId, reason) {
  const body = reason ? { appointmentId, reason } : { appointmentId };

  const res = await fetchWithTimeout("/cancel-appointment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(getPaymentErrorMessage(data));
  }

  return data;
}
