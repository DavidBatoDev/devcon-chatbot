const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export async function sendMessageToBot(message: string) {
  const response = await fetch(`${BACKEND_URL}/api/v1/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: message }),
  });

  if (!response.ok) {
    throw new Error("Bot response failed");
  }

  return await response.json();
}