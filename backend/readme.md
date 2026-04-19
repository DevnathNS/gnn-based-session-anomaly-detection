# Backend 

## Setup
```bash
npm install
npm run dev
```

## Testing endpoints
```bash
curl http://localhost:3000/api/public/news
curl http://localhost:3000/api/user/profile
curl http://localhost:3000/api/admin/users
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/public/news | News feed
| GET | /api/public/about | App info
| GET | /api/user/profile | User profile
| POST | /api/user/profile | Update profile
| GET | /api/user/settings | User settings
| GET | /api/admin/users | View users
| POST | /api/admin/users/:id/delete | Delete users
| POST | /api/payments/transfer | Payment transfer
| GET | /api/data/export | Export payments

Interactive documentation at: https://localhost:3000/docs
