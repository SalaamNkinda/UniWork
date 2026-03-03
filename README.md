> **Restaurant Management System**
>
> *The Bald Gingers Group Project*

## 🚀 1. Setup & Installation
Follow these steps to get the project running on your laptop for the first time.

### **Step A: Prerequisites**
Make sure you have **Node.js** installed.
Type this in your terminal to check:
```bash
node -v
# It should show a version like v18.x.x or v20.x.x

```

### **Step B: Clone & Install**

1. Clone the repository (or download the zip):
```bash
git clone https://github.com/SalaamNkinda/UniWork.git

```


2. Open the folder in **VS Code**.
3. Open the **Terminal** in VS Code (`Ctrl + ~`) and run:
```bash
npm install

```


*(This downloads Express, SQLite3, and other tools from package.json)*

### **Step C: Run the Server**

To start the backend, run:

```bash
npm start

```

* You should see: `✅ Connected to SQLite database`
* You should see: `🚀 Server running on http://localhost:3000`
* *Note: The first time you run this, it will create the database and the 3 default users automatically.*

### **Step D: Open in Browser**

Go to your Chrome/Edge/Safari and type:
**http://localhost:3000**

---

## 🌳 2. Git Workflow (How to work together)

**⚠️ IMPORTANT:** Never push directly to the `main` branch. Always work on your own branch!

### **Creating your Branch (Do this daily)**

When you start working, create a branch with your name:

```bash

git checkout -b <your-branch-name>

```

### **Saving your Work**

1. Stage your changes:
```bash
git add .

```


2. Commit with a message:
```bash
git commit -m "Fixed the login button styling"

```


3. Push to GitHub:
```bash
git push origin <your-branch-name>

```



### **Updating your Code (Pulling from Main)**

If someone else updated the main code, pull it into your branch:

```bash
# 1. Switch to main
git checkout main

# 2. Download latest updates
git pull origin main

# 3. Go back to your branch and merge
git checkout <your-branch-name>
git merge main

```

---

## 🔑 3. Login Cheat Sheet

Use these credentials to test the different user roles:

| Role | Username | PIN | Access |
| --- | --- | --- | --- |
| **Admin** | `admin` | **1111** | Majid's Dashboard |
| **Waiter** | `waiter` | **2222** | Salaam's POS |
| **Chef** | `chef` | **3333** | Atif's Inventory |

---

## 🛠️ Troubleshooting

**"I can't log in! Users table is empty."**
Stop the server (Ctrl + C), delete the `restaurant.db` file, and run `npm start` again. The code will automatically re-create the database and create the 3 default users.

**"Port 3000 is already in use"**
This means the server is already running somewhere. Close your other terminal windows or restart VS Code.

```

```