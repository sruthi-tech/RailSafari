# RailSafari

🚆 RailSafari

Database-Driven Train Ticket Reservation & Journey Management System

RailSafari is a college DBMS project that aims to provide a user-friendly digital platform for searching trains, checking seat availability, booking tickets, managing passengers, and handling cancellations.

The project demonstrates how a relational database can be integrated with a modern web application to implement a complete train ticket reservation workflow.

🎓 Academic Project
Developed as part of a Database Management Systems (DBMS) course.

⸻

✨ Features

👤 User Management

* User registration and login
* User profile management
* Phone number and email-based account details
* IRCTC User ID support
* Simulated DigiLocker identity verification

🚆 Train Search & Availability

* Search trains by:
    * Starting station
    * Destination
    * Journey date
* View available trains
* View train schedules
* Check seat availability
* View train details and fare information
* Today’s available trains

🎫 Ticket Reservation

* Regular train booking
* Tatkal booking interface
* Passenger information management
* Multiple passenger booking
* Seat selection
* Class selection
* Fare calculation
* Booking confirmation
* PNR generation
* Digital ticket display

💳 Payment

* Simulated payment system
* Multiple payment method options
* Payment status tracking
* Booking-payment association

❌ Cancellation

* Search bookings using PNR
* Cancel tickets
* Calculate/display refund amount
* Update seat availability after cancellation
* Maintain cancellation records

📋 Booking Management

* View upcoming bookings
* View previous bookings
* View ticket details
* PNR-based booking lookup

👨‍💼 Admin Features

* Admin dashboard
* Manage trains
* Manage stations
* Manage routes
* Manage schedules
* Manage seats
* View users
* View bookings
* View cancellations
* Generate basic booking statistics

⸻

🛠️ Technologies Used

Frontend

* React.js
* HTML5
* CSS3
* JavaScript

Backend

* Node.js
* Express.js
* REST APIs

Database

* Oracle Database
* SQL
* PL/SQL

Development Tools

* Git
* GitHub
* Antigravity
* VS Code

⸻

🏗️ System Architecture

                    ┌─────────────────────┐
                    │      FRONTEND       │
                    │      React.js       │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │       BACKEND       │
                    │   Node.js + Express │
                    └──────────┬──────────┘
                               │
                               │ Oracle Driver
                               ▼
                    ┌─────────────────────┐
                    │    ORACLE DATABASE  │
                    │      SQL / PL/SQL   │
                    └─────────────────────┘

⸻

🗄️ Database Design

The Oracle database is designed using a relational model with interconnected entities.

Main Tables

Table	Description
USERS	Stores registered user information
TRAIN	Stores train details
STATION	Stores railway station information
TRAIN_ROUTE	Stores train routes and station sequences
SCHEDULE	Stores train schedules
COACH	Stores coach information
SEAT	Stores seat information and availability
BOOKING	Stores ticket booking details
PASSENGER	Stores passenger information
PAYMENT	Stores payment details
CANCELLATION	Stores cancelled ticket information

Database Concepts Demonstrated

* Primary Keys
* Foreign Keys
* Candidate/Unique Keys
* NOT NULL
* CHECK constraints
* DEFAULT values
* Referential Integrity
* One-to-One relationships
* One-to-Many relationships
* SQL Joins
* Nested Queries
* Aggregate Functions
* GROUP BY
* HAVING
* ORDER BY
* Views
* Sequences
* Triggers
* Stored Procedures
* Functions
* Transactions

⸻

🔄 Booking Workflow

User
 │
 ▼
Login / Sign Up
 │
 ▼
Search Train
 │
 ▼
Select Journey
 │
 ▼
Check Availability
 │
 ▼
Select Train & Class
 │
 ▼
Enter Passenger Details
 │
 ▼
Select Seat
 │
 ▼
Review Booking
 │
 ▼
Simulated Payment
 │
 ▼
Booking Confirmation
 │
 ▼
Generate PNR
 │
 ▼
Digital Ticket

⸻

📱 Application Pages

Authentication

* Welcome Page
* Login
* Sign Up
* Simulated Identity Verification

User Dashboard

* Home
* Book a Train
* Check Train Availability
* Today’s Trains
* Tatkal Booking
* My Bookings
* Cancel Ticket
* Profile

Booking

* Train Search
* Available Trains
* Train Details
* Passenger Details
* Seat Selection
* Booking Summary
* Payment
* Booking Confirmation
* Digital Ticket

Administration

* Admin Dashboard
* Train Management
* Station Management
* Route Management
* Schedule Management
* Seat Management
* Booking Management
* Cancellation Management

⸻

🔐 Security & Privacy

This project is developed for academic and demonstration purposes.

The application may contain simulated features representing services such as identity verification and payment processing. It does not establish a real connection with Indian Railways, IRCTC, DigiLocker, Aadhaar, or any real payment gateway.

No real Aadhaar numbers, identity documents, banking credentials, or payment information should be entered into the academic demonstration system.

⸻

📂 Project Structure

RailSafari/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   └── package.json
│
├── database/
│   ├── 01_tables.sql
│   ├── 02_constraints.sql
│   ├── 03_sequences.sql
│   ├── 04_sample_data.sql
│   ├── 05_views.sql
│   ├── 06_procedures.sql
│   └── 07_triggers.sql
│
├── screenshots/
│
├── README.md
└── .gitignore

⸻

⚙️ Installation & Setup

1. Clone the repository

git clone <repository-url>
cd RailSafari

2. Set up Oracle Database

Create the database tables and objects using the SQL scripts inside:

database/

Execute the scripts in the recommended order.

3. Configure the backend

Create a .env file inside the backend directory:

PORT=5000
DB_USER=your_oracle_username
DB_PASSWORD=your_oracle_password
DB_CONNECT_STRING=your_oracle_connection_string

4. Install backend dependencies

cd backend
npm install

Start the backend:

npm run dev

5. Install frontend dependencies

Open another terminal:

cd frontend
npm install

Start the frontend:

npm run dev

⸻

🧪 Testing

The system can be tested using:

* User registration
* User login
* Train search
* Availability checking
* Seat selection
* Passenger registration
* Ticket booking
* Simulated payment
* PNR generation
* Booking history
* Ticket cancellation
* Seat availability updates
* Admin operations

⸻

🎯 Project Objectives

The main objectives of RailSafari are:

1. To design and implement a relational database for a train reservation system.
2. To demonstrate practical applications of DBMS concepts.
3. To provide an intuitive interface for train searching and ticket booking.
4. To implement relationships between trains, stations, schedules, passengers, and bookings.
5. To demonstrate SQL and PL/SQL operations.
6. To implement a complete booking and cancellation workflow.
7. To integrate an Oracle database with a web-based application.

⸻

👩‍💻 Team Members

Name	Role
Rahaf	Team Member
Ayesha	Team Member
Rehas	Team Member
Aditi	Team Member

👥 Team

Rahaf · Ayesha · Rehas · Aditi

⸻

📚 Academic Context

Project: RailSafari
Type: DBMS / Web Application Project
Database: Oracle Database
Purpose: Academic / Educational

This project is developed to demonstrate the practical implementation of database management concepts through a complete web-based train ticket reservation system.

⸻

📌 Disclaimer

RailSafari is an academic project created for educational purposes. It is not affiliated with, operated by, or officially connected to Indian Railways, IRCTC, DigiLocker, UIDAI, or any government organization.

All payment, identity verification, railway booking, and related services shown in the application are simulated for demonstration purposes.
