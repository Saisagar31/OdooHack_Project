# 🚛 TransitOps - Smart Transport Operations Platform

> A centralized fleet management platform that digitizes transport operations by managing vehicles, drivers, trips, maintenance, fuel, expenses, and analytics with real-time business validations.

---

## 📖 Overview

TransitOps is a modern web application designed to help logistics companies efficiently manage their transport operations.

Instead of relying on spreadsheets and manual records, TransitOps provides a single dashboard to manage:

- 🚚 Fleet Management
- 👨‍✈️ Driver Management
- 📦 Trip Dispatch
- 🔧 Vehicle Maintenance
- ⛽ Fuel & Expense Tracking
- 📊 Reports & Analytics

The platform automatically enforces business rules, preventing invalid operations and ensuring smooth fleet management.

---

## ✨ Features

### 🔐 Authentication & Authorization

- Secure Email & Password Login
- Role-Based Access Control (RBAC)
- Protected Routes

### 👥 User Roles

- Fleet Manager
- Driver
- Safety Officer
- Financial Analyst

---

### 📊 Dashboard

Real-time operational KPIs

- Active Vehicles
- Available Vehicles
- Vehicles in Maintenance
- Active Trips
- Pending Trips
- Drivers On Duty
- Fleet Utilization
- Charts & Analytics

---

### 🚚 Vehicle Management

- Register Vehicles
- Update Vehicle Details
- Delete Vehicles
- Search & Filter
- Vehicle Status Tracking

Vehicle Status

- Available
- On Trip
- In Shop
- Retired

---

### 👨 Driver Management

Manage Driver Profiles

- License Information
- License Expiry
- Safety Score
- Contact Information
- Driver Availability

Driver Status

- Available
- On Trip
- Off Duty
- Suspended

---

### 📦 Trip Management

Create and manage trips

Trip Lifecycle

Draft

↓

Dispatched

↓

Completed

↓

Cancelled

---

### 🔧 Maintenance Management

- Create Maintenance Logs
- Track Repairs
- Auto Vehicle Status Updates

Vehicle automatically becomes:

Available

↓

In Shop

After maintenance is completed:

In Shop

↓

Available

---

### ⛽ Fuel & Expense Tracking

Record

- Fuel Logs
- Maintenance Cost
- Toll Charges
- Other Expenses

Automatically calculates

- Fuel Cost
- Maintenance Cost
- Total Operational Cost

---

### 📈 Reports & Analytics

Generate operational insights

- Fuel Efficiency
- Fleet Utilization
- Operational Cost
- Vehicle ROI
- Expense Analysis

---

## ✅ Business Rules

The application automatically validates business rules before every operation.

✔ Vehicle Registration Number must be unique.

✔ Retired vehicles cannot be dispatched.

✔ Vehicles under maintenance cannot be dispatched.

✔ Suspended drivers cannot be assigned.

✔ Drivers with expired licenses cannot be assigned.

✔ Drivers already on a trip cannot be assigned again.

✔ Vehicles already on a trip cannot be assigned again.

✔ Cargo weight cannot exceed vehicle capacity.

✔ Dispatch automatically updates

Vehicle

Available

↓

On Trip

Driver

Available

↓

On Trip

✔ Completing a trip restores

Vehicle

On Trip

↓

Available

Driver

On Trip

↓

Available

✔ Starting maintenance automatically changes

Vehicle

↓

In Shop

✔ Closing maintenance restores

Vehicle

↓

Available

---

## 🏗 Database Entities

- Users
- Roles
- Vehicles
- Drivers
- Trips
- Maintenance Logs
- Fuel Logs
- Expenses

---

## 🛠 Tech Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- React Router
- Recharts

### Backend

- Node.js
- Express.js

### Database

- PostgreSQL / Supabase

### Authentication

- Supabase Auth / JWT

### Deployment

- Vercel
- Render

---

## 📂 Project Structure

```
TransitOps/

│── frontend/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── hooks/
│   └── utils/

│── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── models/
│   └── config/

│── database/

│── docs/

│── README.md
```

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/TransitOps.git
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### Backend

```bash
cd backend
npm install
npm start
```

---

## 📊 Sample Workflow

### Step 1

Register Vehicle

```
Van-05
Capacity : 500 KG
Status : Available
```

↓

### Step 2

Register Driver

```
Alex
License : Valid
Status : Available
```

↓

### Step 3

Create Trip

```
Source : Bangalore

Destination : Chennai

Cargo : 450 KG
```

↓

### Step 4

Validation

```
450 KG <= 500 KG

✔ Dispatch Allowed
```

↓

### Step 5

Vehicle Status

```
Available

↓

On Trip
```

Driver Status

```
Available

↓

On Trip
```

↓

### Step 6

Complete Trip

```
Final Odometer

Fuel Consumed
```

↓

### Step 7

Vehicle

```
On Trip

↓

Available
```

Driver

```
On Trip

↓

Available
```

↓

### Step 8

Create Maintenance

Vehicle

```
Available

↓

In Shop
```

↓

### Step 9

Dashboard Updates Automatically

- Fuel Cost
- Operational Cost
- Fleet Utilization
- Fuel Efficiency
- Reports

---

## 📌 Future Enhancements

- Email Reminders for License Expiry
- Vehicle Document Upload
- PDF Export
- CSV Export
- Dark Mode
- GPS Tracking
- Live Vehicle Location
- Notifications
- Predictive Maintenance using AI

---

## 👨‍💻 Team

Built with ❤️ during the Hackathon.

---

## 📜 License

This project was developed for educational and hackathon purposes.
