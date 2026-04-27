import React, { useState, useEffect } from "react";
import api from "../utils/api";

export default function NewsPage() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    api.get('/api/public/news')
      .then(res => setNews(res.data.data.articles || []))
      .catch(() => console.log('Failed to load news'));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Company News</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Stay updated with the latest announcements and platform updates.
      </p>

      <div style={{ marginTop: 20 }}>
        {news.length === 0 ? (
          <p>No news available at the moment.</p>
        ) : (
          news.map((item, index) => (
            <div key={index} style={{ marginBottom: 16 }}>
              <h3>{item.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>{item.date}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
