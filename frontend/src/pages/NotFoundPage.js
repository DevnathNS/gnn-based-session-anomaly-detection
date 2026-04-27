import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h1>404</h1>
      <p style={{ marginTop: 10 }}>Page not found</p>

      <Link to="/" style={{ marginTop: 20, display: "inline-block" }}>
        Go back to Home
      </Link>
    </div>
  );
}
