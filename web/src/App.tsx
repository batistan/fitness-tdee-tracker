import { createSignal, onMount } from "solid-js";

interface HealthStatus {
  status: string;
  timestamp: string;
  environment: string;
}

export default function App() {
  const [health, setHealth] = createSignal<HealthStatus | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const response = await fetch("/api/health");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect to API");
    }
  });

  return (
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">TDEE Tracker</h1>

        {error() && (
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            API Error: {error()}
          </div>
        )}

        {health() && (
          <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p>
              <strong>Status:</strong> {health()!.status}
            </p>
            <p>
              <strong>Environment:</strong> {health()!.environment}
            </p>
            <p>
              <strong>Timestamp:</strong> {health()!.timestamp}
            </p>
          </div>
        )}

        {!health() && !error() && (
          <p class="text-gray-600">Connecting to API...</p>
        )}
      </div>
    </div>
  );
}
