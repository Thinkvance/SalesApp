// VersionUpdateModal.js

import React from "react";

function VersionUpdateModal({ message, onRefresh }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "2rem",
          borderRadius: "12px",
          maxWidth: "90%",
          width: "400px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <h2
          style={{
            marginBottom: "1rem",
            color: "#333",
            fontSize: "1.5rem",
          }}
        >
          🚀 Update Available
        </h2>

        <p
          style={{
            fontSize: "1rem",
            color: "#555",
            marginBottom: "1.5rem",
          }}
        >
          {message}
        </p>

        <button
          onClick={onRefresh}
          style={{
            backgroundColor: "#6f42c1", // Bootstrap purple
            color: "#fff",
            border: "none",
            padding: "0.75rem 1.5rem",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#5a32a3"; // Darker purple on hover
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
