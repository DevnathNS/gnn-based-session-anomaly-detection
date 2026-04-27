import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    api.get("/api/admin/users")
      .then(res => setUsers(res.data.data.users || []))
      .catch(() => console.log("Failed to fetch users"));
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Panel</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Manage users and system access.
      </p>

      <div style={{ marginTop: 20 }}>
        {users.length === 0 ? (
          <p>No users available</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 10,
                borderBottom: "1px solid #ddd"
              }}
            >
              <span>{user.email} ({user.role})</span>
              <button
                onClick={() =>
                  api.post(`/api/admin/users/${user.id}/delete`).then(() => fetchUsers())
                }
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
