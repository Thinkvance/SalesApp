import React from "react";

function VersionUpdateModal({ message, onRefresh }) {
  return (
    <div>
      <style>
        {`
          /* Ultra-Realistic Spring Bounce (UNCHANGED) */
          @keyframes ultraSpringBounce {
            0%   { transform: translateY(0); }
            6%   { transform: translateY(-65px); }
            16%  { transform: translateY(12px); }
            26%  { transform: translateY(-8px); }
            36%  { transform: translateY(5px); }
            46%  { transform: translateY(-3px); }
            56%  { transform: translateY(2px); }
            66%  { transform: translateY(-1px); }
            76%  { transform: translateY(0); }
            100% { transform: translateY(0); }
          }

          .ultra-spring {
            animation: ultraSpringBounce 3.8s cubic-bezier(.17,.89,.32,1.27) infinite;
            transform-origin: bottom center;
            will-change: transform;
          }
        `}
      </style>

      <div
        className="ultra-spring"
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
          onClick={onRefresh}
          style={{
            backgroundColor: "#6f42c1",
            color: "#fff",
            border: "none",
            padding: "0.75rem 1.4rem",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
            width: "100%",
            transition: "0.2s",
            boxShadow: "0 3px 10px rgba(111,66,193,0.25)",
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#5a32a3";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#6f42c1";
          }}
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}

export default VersionUpdateModal;