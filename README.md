# Bitespeed Identity Reconciliation Service

A backend service that identifies and tracks customer identities across multiple purchases using different contact information.

## 🚀 Live Endpoint

**Base URL:** `[YOUR_DEPLOYED_URL]`

**Identify Endpoint:** `POST /identify`

## 📋 Problem Statement

FluxKart.com integrates with Bitespeed to provide personalized customer experiences. When customers make purchases using different email addresses and/or phone numbers, this service links all related contact information to identify them as the same person.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** SQLite (via Prisma ORM)
- **ORM:** Prisma

## 📁 Project Structure

```
bitespeed_assignment/
├── src/
│   ├── controllers/
│   │   └── identify.controller.ts
│   ├── services/
│   │   ├── contact.service.ts
│   │   └── identify.service.ts
│   ├── routes/
│   │   └── identify.ts
│   ├── types/
│   │   └── index.ts
│   ├── db.ts
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── package.json
├── tsconfig.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bitespeed_assignment
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

4. Start the development server:
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## 📡 API Reference

### POST /identify

Identifies and consolidates contact information for a customer.

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Note:** At least one of `email` or `phoneNumber` must be provided.

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@example.com", "secondary@example.com"],
    "phoneNumbers": ["1234567890", "0987654321"],
    "secondaryContactIds": [2, 3]
  }
}
```

### Examples

#### 1. New Customer
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "doc@flux.com", "phoneNumber": "88888888"}'
```

Response:
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["doc@flux.com"],
    "phoneNumbers": ["88888888"],
    "secondaryContactIds": []
  }
}
```

#### 2. Secondary Contact Creation
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "brown@future.com", "phoneNumber": "88888888"}'
```

Response:
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["doc@flux.com", "brown@future.com"],
    "phoneNumbers": ["88888888"],
    "secondaryContactIds": [2]
  }
}
```

#### 3. Primary Merge (Two Primaries Linked)
When a request links two previously separate contacts, the older one remains primary.

## 🔧 Database Schema

### Contact Table

| Column | Type | Description |
|--------|------|-------------|
| id | Int | Primary key |
| phoneNumber | String? | Customer phone number |
| email | String? | Customer email |
| linkedId | Int? | Reference to primary contact |
| linkPrecedence | String | "primary" or "secondary" |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| deletedAt | DateTime? | Soft delete timestamp |

## 🧪 Testing

Run the application and test with the following scenarios:

```powershell
# Test 1: New customer
$body = @{email="test@example.com"; phoneNumber="1234567890"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/identify" -Method Post -Body $body -ContentType "application/json"

# Test 2: Secondary creation (same phone, new email)
$body = @{email="test2@example.com"; phoneNumber="1234567890"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/identify" -Method Post -Body $body -ContentType "application/json"
```

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled application |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |

## 🌐 Deployment

### Deploy to Render.com

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set build command: `npm install && npx prisma generate && npm run build`
5. Set start command: `npm start`
6. Add environment variable: `DATABASE_URL=file:./dev.db`
7. Deploy!

## 📄 License

ISC

## 👤 Author

Tushar Singh

---

Made with ❤️ for Bitespeed
