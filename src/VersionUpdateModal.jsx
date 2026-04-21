import { useEffect, useState } from "react";

function VersionUpdateModal({ message, onRefresh }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div>
      <style>
        {`
          .update-btn {
            background-color: #6f42c1;
            transition: 0.25s ease;
          }
          .update-btn:hover { filter: brightness(0.92); }
        `}
      </style>

      {isMobile ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(139,92,246,0.35)",
            boxShadow: "0 -2px 10px rgba(0,0,0,0.08)",
            padding: "10px 12px",
            paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 99999,
          }}
        >
          <span
            style={{
              flex: 1,
              color: "#1e1e1e",
              fontSize: "0.9rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {message || "Update available"}
          </span>
          <button
            className="update-btn"
            onClick={onRefresh}
            style={{
              color: "#fff",
              border: "none",
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: "0.88rem",
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Refresh
          </button>
        </div>
      ) : (
        <div
          style={{
            position: "fixed",
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(10px)",
            padding: "1.8rem 1.6rem",
            borderRadius: "16px",
            maxWidth: "90%",
            width: "360px",
            boxShadow:
              "0 6px 20px rgba(0,0,0,0.15), 0 0 0 1.5px rgba(139,92,246,0.25)",
            border: "1px solid rgba(139,92,246,0.45)",
            textAlign: "center",
            right: 24,
            bottom: 24,
            zIndex: 99999,
          }}
        >
          <h2
            style={{
              marginBottom: "0.6rem",
              color: "#1e1e1e",
              fontSize: "1.45rem",
              fontWeight: 600,
            }}
          >
            🚀 Update Available
          </h2>

          <p
            style={{
              marginBottom: "1.4rem",
              color: "#4b4b4b",
              fontSize: "1.05rem",
              lineHeight: 1.45,
              fontWeight: 400,
            }}
          >
            {message}
          </p>

          <button
            className="update-btn"
            onClick={onRefresh}
            style={{
              color: "#fff",
              border: "none",
              padding: "0.75rem 1.4rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: "pointer",
              width: "100%",
              boxShadow: "0 3px 10px rgba(111,66,193,0.25)",
            }}
          >
            Refresh Now
          </button>
        </div>
      )}
    </div>
  );
}

export default VersionUpdateModal;