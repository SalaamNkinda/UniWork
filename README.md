# 🍽️ Smart Kitchen + Sales Dashboard

> **A Full-Stack Restaurant Management System**
>
> *GINGERS Group Project - Year 2 Web Development*

## 📖 Project Overview

This project is a comprehensive web application designed to digitize the operations of a restaurant. Unlike standard inventory systems, this solution integrates **Supply Chain (Back of House)**, **Point of Sale (Front of House)**, and **Business Intelligence (Admin)** into a single cohesive platform.

The system tackles complex logic such as **dynamic recipe costing**, **real-time table state management**, and **live profit margin analysis** based on labor and ingredient costs.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript
* **Backend:** PHP (Vanilla)
* **Database:** MySQL / MariaDB
* **Design/Prototyping:** Figma

---

## 👥 Team & Workload Distribution

This project consists of three distinct, high-complexity modules, each owned by a specific group member.

### 👨‍🍳 Atif: Inventory & Recipe Architecture
**Focus:** Supply Chain, Cost Engineering, and Ingredient Logic.
* **Core Features:**
    * **Raw Ingredient CRUD:** Managing stock levels, units (kg/g/L), and supplier details.
    * **Dynamic Recipe Builder:** A complex Many-to-Many relationship manager that links ingredients to menu items.
    * **Auto-Costing Algorithm:** Automatically calculates the "Cost Price" of a dish based on the current market price of its ingredients.
    * **Low Stock Triggers:** Visual alerts when specific ingredients fall below a safety threshold.

### 🛎️ Majid: Point of Sale (POS) & Floor Management
**Focus:** Transactional Logic, State Management, and User Interface.
* **Core Features:**
    * **Interactive Floor Plan:** A visual grid representing table states (Green=Empty, Orange=Seated, Red=Occupied).
    * **Live Order System:** AJAX-driven cart system for taking orders and sending them to the kitchen.
    * **Inventory Deduction:** Triggering the "Sale" event subtracts specific ingredients (from Member 1's logic) from the inventory.
    * **Bill Splitting:** JavaScript logic to handle complex payment scenarios (split by person vs. split by item).

### 📈 Salaam: Business Intelligence & Workforce
**Focus:** Data Aggregation, Security, and Profit Analysis.
* **Core Features:**
    * **Real-Time Profit Dashboard:** Aggregates data from Sales (Member 2) and Inventory/Labor (Members 1 & 3) to calculate Net Profit.
    * **Staff Roster & Time Clock:** A PIN-based login system for staff to clock in/out, calculating daily labor costs.
    * **Sales Velocity Charts:** Data visualization (Chart.js) showing peak business hours and top-selling categories.
    * **Global Auth & Security:** Managing session states (Admin vs. Staff) and password hashing.

---

## 📂 Project Structure

```bash
/project-root
│
├── /assets
│   ├── /css          # Stylesheets
│   ├── /js           # Frontend Logic (AJAX, DOM manipulation)
│   └── /images       # Food icons, layout assets
│
├── /config
│   └── db.php        # Database connection (Singleton pattern)
│
├── /modules
│   ├── /inventory    # Atif's PHP Logic (Ingredients, Recipes)
│   ├── /pos          # Majid's PHP Logic (Orders, Tables)
│   └── /admin        # Salaam's PHP Logic (Staff, Reports)
│
├── /includes         # Shared Headers/Footers
│
└── index.php         # Login Gateway