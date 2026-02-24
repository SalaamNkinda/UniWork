# 🍽️ Smart Kitchen + Sales Dashboard

> **A Full-Stack Restaurant Management System**
>
> *GINGERS Group Project - Year 2 Web Development*

## 📖 Project Overview

This project is a comprehensive web application designed to digitize the operations of a restaurant. Unlike standard inventory systems, this solution integrates **Supply Chain (Back of House)**, **Point of Sale (Front of House)**, and **Business Intelligence (Admin)** into a single cohesive platform.

The system manages food stock, processes customer orders at tables, and tracks staff hours to calculate real-time net profit. It tackles complex logic such as **dynamic recipe costing**, **real-time table state management**, and **live profit margin analysis**.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend:** Deno (JavaScript Runtime)
* **Database:** SQLite (`jsr:@db/sqlite`)
* **Design/Prototyping:** Figma

---

## 👥 Team & Workload Distribution

This project consists of three distinct, high-complexity modules, each owned by a specific group member. Every module implements full CRUD (Create, Read, Update, Delete) functionality.

### 👨‍🍳 Atif: "Inventory & Menu" Manager
**Role:** Manages the food, suppliers, and recipes. | **Target User:** Chef / Admin
* **The "Ingredients" Page:** Tracks raw items (e.g., Flour, Cheese). Features visual **Low Stock Alerts** (rows turn red < 1kg) and supplier management.
* **The "Recipe Builder" Page:** A complex interface to link raw ingredients to final menu items (e.g., "1 Pizza = 200g Flour + 100g Cheese"). Includes **Auto-Costing JavaScript logic** to calculate dish prices based on ingredient costs.
* **CRUD Capabilities:**
    * **Create:** Add new raw ingredients and menu items.
    * **Read:** View the inventory list and low-stock alerts.
    * **Update:** Edit ingredient prices or update supplier details.
    * **Delete:** Remove discontinued menu items or obsolete stock.
* **Extra Complexity:** **Wastage Logging**. A dedicated form to log dropped or spoiled food, which correctly updates the inventory without adding false revenue to sales.

### 🛎️ Salaam: "POS & Floor" Manager
**Role:** Manages tables, orders, and reservations. | **Target User:** Waiter / Staff
* **The "Floor Plan" Page:** Visual map of tables with **State Management** (Green = Empty, Orange = Seated, Red = Waiting for Food).
* **The "Order Taking" Page:** A digital POS cart. **Crucial Logic:** Sending an order to the kitchen triggers a backend event that automatically subtracts Atif's ingredients from the database.
* **CRUD Capabilities:**
    * **Create:** Open new table orders and create customer table reservations.
    * **Read:** View the live floor plan, active cart items, and today's booking list.
    * **Update:** Modify active orders (add/remove items) and update table states.
    * **Delete:** Void an order (requires Admin PIN) or cancel a reservation.
* **Extra Complexity:** 1. **Reservation System:** A calendar interface with validation to prevent double-booking tables.
    2. **Kitchen Display System (KDS):** A live secondary screen that pulls active orders for the chef.

### 📈 Majid: "Staff & Dashboard" Manager
**Role:** Manages people, security, and business health. | **Target User:** Owner / Manager
* **The "Staff Roster" Page:** Features a PIN-based **Clock-In System** and handles **Payroll Calculation** (Hours Worked x Hourly Rate).
* **The "Business Intelligence" Dashboard:** The data hub. Uses Chart.js to visualize peak hours. **Crucial Logic:** Calculates Net Profit dynamically: `Total Sales (Salaam) - [Ingredient Cost (Atif) + Staff Pay (Majid)]`.
* **CRUD Capabilities:**
    * **Create:** Add new staff members to the database.
    * **Read:** View the analytics dashboard, profit charts, and staff roster.
    * **Update:** Edit staff roles/pay rates or manually fix a missed time-clock entry.
    * **Delete:** Terminate/deactivate a staff account.
* **Extra Complexity:** **Shift Scheduling**. A visual calendar tool to assign employee shifts, which ties directly into the payroll forecasting.

---

## 🗺️ Application Web Flow

The system is interconnected through a central authentication gateway and a role-based navigation bar.

1. **Login Page (Gateway):** * User enters credentials.
    * **If Admin:** Redirects to **Dashboard** (Majid's Module).
    * **If Waiter:** Redirects to **Floor Plan** (Salaam's Module).
    * **If Chef:** Redirects to **Inventory List** (Atif's Module).
2. **Navigation Bar (Role-Restricted):**
    * `Floor` Button ➔ Takes user to Salaam's Table Map.
    * `Kitchen` Button ➔ Takes user to Atif's Inventory.
    * `Admin` Button ➔ Takes user to Majid's BI Dashboard *(Hidden from standard Waiter/Chef roles)*.

---

## 🚀 How to Run the Application

Follow these steps to run the local server and initialize the SQLite database.

1. Open your terminal in VS Code.
2. Ensure you are in the root directory of the project.
3. Run the following commands:

```bash
# Add the SQLite package to Deno
deno add jsr:@db/sqlite

# Start the server (includes all necessary permissions)
deno task start

```

4. Once the terminal displays the success message, open your web browser and navigate to:
**http://localhost:8000**

```

```