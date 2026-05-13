import React, {useState, useEffect} from "react";
import api from '../utils/api';

export default function PricingPage() {
	useEffect(() => {
		api.get('/api/public/home-view').catch(() => {});
	},[]);
  return (
    <div style={{ padding: 24 }}>
      <h1>Pricing Plans</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        Choose a plan that fits your organization.
      </p>

      <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
        
        <div style={{ border: "1px solid #ccc", padding: 16, flex: 1 }}>
          <h3>Free</h3>
          <p>Basic access</p>
          <p>$0 / month</p>
        </div>

        <div style={{ border: "1px solid #ccc", padding: 16, flex: 1 }}>
          <h3>Pro</h3>
          <p>Advanced features</p>
          <p>$15 / month</p>
        </div>

        <div style={{ border: "1px solid #ccc", padding: 16, flex: 1 }}>
          <h3>Enterprise</h3>
          <p>Full access + admin tools</p>
          <p>$50 / month</p>
        </div>

      </div>
    </div>
  );
}
