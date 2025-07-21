# Gen8-Inventory

**Gen8-Inventory** is a full-stack inventory management system designed to be simple, secure, and highly customizable for manufacturing and logistics workflows. It supports client-based item tracking, lot number control, CSV import/export, and role-based access control.

## 🔧 Features

- 📦 **Client-Specific Inventory** – Manage inventory tied to unique clients
- 🔐 **Role-Based Access** – Admins manage users/items; Staff can view & search
- 🔄 **Bulk Import/Export** – Upload and export inventory with CSV support
- 🔍 **Search and Pagination** – Find items by name or part number
- 🔢 **Lot Number Toggle** – Enable/disable lot tracking per item
- 🖥️ **Modern UI** – Responsive React frontend styled with Tailwind
- ⚙️ **Local SQLite DB** – Simple storage for fast setup and testing

## 🛠️ Tech Stack

| Layer        | Tech                        |
| ------------ | --------------------------- |
| Frontend     | React, Tailwind CSS         |
| Backend      | Node.js, Express            |
| Database     | SQLite (via better-sqlite3) |
| Auth         | JWT-based with role support |
| File Parsing | PapaParse (CSV import)      |

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/l8nightswithJS/Gen8-Inventory.git
cd Gen8-Inventory
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd frontend
npm install
```

### 3. Run the App

Open **two terminals**:

#### Terminal 1 – Backend (Port 8000)

```bash
cd backend
npm start
```

#### Terminal 2 – Frontend (Port 3000)

```bash
cd frontend
npm start
```

## 📁 Project Structure

```
Gen8-Inventory/
├── backend/
│   ├── models/            # SQLite DB access
│   ├── controllers/       # Express route handlers
│   ├── routes/            # API routes (clients, items, users)
│   └── server.js          # Main Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Views (Dashboard, Inventory, etc.)
│   │   └── App.jsx        # App entry and routing
│
└── README.md
```

## 🔐 Access & Roles

| Role  | Permissions                        |
| ----- | ---------------------------------- |
| Admin | Full CRUD, User Management, Import |
| Staff | Read/Search Only                   |

## 📦 CSV Format for Bulk Import

Your CSV must include the following **headers**:

```
name, part_number, description, lot_number, quantity, location, has_lot
```

- `has_lot` should be `1` (true) or `0` (false)
- Omit `lot_number` for non-lot items

## 🛡️ Security & Compliance

- All endpoints protected by JWT
- Accessibility-friendly UI design
- Passwords hashed using bcrypt

## 🧭 Roadmap

- [x] Item CRUD + Search
- [x] Role-based Access
- [x] Bulk CSV Import/Export
- [x] Per-item Lot Control
- [ ] Work Order Digitization
- [ ] Audit Trail Logging
- [ ] REST → GraphQL optional support
- [ ] SSO/LDAP Integration

## 🧪 Testing

Basic tests can be run manually with seed data. Jest/unit test integration is a planned improvement.

## 🤝 Contributing

Pull requests welcome. Please:

- Fork the repo
- Use descriptive commit messages
- Follow existing code structure

## 📄 License

MIT License

## 🧠 Credits

Developed by [Eduardo Jimenez](https://github.com/l8nightswithJS) for use in production logistics environments such as **Gener8**.
