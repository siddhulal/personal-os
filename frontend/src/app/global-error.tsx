"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: "500px", textAlign: "center", padding: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "red", marginBottom: "12px" }}>
              Application Error
            </h2>
            <p style={{ fontSize: "14px", color: "#666", wordBreak: "break-word", marginBottom: "16px" }}>
              {error.message}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                background: "#333",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
