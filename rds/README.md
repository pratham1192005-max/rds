# Employee Manager – Node.js + MySQL (AWS RDS) CRUD

A small app: Express backend, plain HTML/CSS/JS frontend, MySQL on AWS RDS.

Files: `server.js`, `index.html`, `style.css`, `app.js`, `schema.sql`, `package.json`, `.env.example`

---

## 1. Create the RDS MySQL instance

1. AWS Console → RDS → Create database → **MySQL** (Free tier template is fine).
2. Set master username (e.g. `admin`) and a password.
3. Connectivity: choose the **same VPC** as your EC2 instance. Public access: **No** (recommended).
4. Create a security group for RDS (e.g. `rds-sg`) – you'll configure it in step 3.
5. Note the **endpoint** once it's available (e.g. `mydb.abc123.ap-south-1.rds.amazonaws.com`).

## 2. Launch the EC2 instance

- Amazon Linux 2023 or Ubuntu, same VPC as RDS.
- Security group for EC2 (e.g. `ec2-sg`) inbound rules:
  - SSH (22) from your IP
  - Custom TCP **3000** (or HTTP 80 if using nginx) from 0.0.0.0/0

## 3. Allow EC2 → RDS

Edit the **RDS security group** inbound rules:

| Type         | Port | Source   |
|--------------|------|----------|
| MYSQL/Aurora | 3306 | `ec2-sg` (the EC2 security group) |

## 4. Set up EC2

SSH in, then:

**Amazon Linux 2023**
```bash
sudo dnf update -y
sudo dnf install -y nodejs npm mariadb105 git
```

**Ubuntu**
```bash
sudo apt update
sudo apt install -y nodejs npm mysql-client
```

Check: `node -v` (v18+ recommended).

## 5. Copy the project and install

```bash
mkdir ~/rds-crud-app && cd ~/rds-crud-app
# upload the files here (scp, git, or WinSCP), then:
npm install
cp .env.example .env
nano .env        # put your RDS endpoint, user, password
```

## 6. Create database, table and sample data

```bash
mysql -h <RDS_ENDPOINT> -u admin -p < schema.sql
```

Verify:
```bash
mysql -h <RDS_ENDPOINT> -u admin -p -e "SELECT * FROM company_db.employees;"
```

## 7. Run

```bash
npm start
```

Open `http://<EC2_PUBLIC_IP>:3000`. The badge at the top-right shows **RDS connected** when it works.

### Keep it running (PM2)

```bash
sudo npm install -g pm2
pm2 start server.js --name rds-crud
pm2 save
pm2 startup        # run the command it prints
```

### Optional: serve on port 80

Quick way: set `PORT=80` in `.env` and run `sudo pm2 start server.js`, or use nginx as a reverse proxy to port 3000.

---

## Database queries used

```sql
-- Create DB + table
CREATE DATABASE IF NOT EXISTS company_db;
USE company_db;
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CREATE
INSERT INTO employees (name, email, department, salary) VALUES (?, ?, ?, ?);
-- READ
SELECT * FROM employees ORDER BY id DESC;
SELECT * FROM employees WHERE id = ?;
SELECT * FROM employees WHERE name LIKE ? OR email LIKE ? OR department LIKE ?;
-- UPDATE
UPDATE employees SET name=?, email=?, department=?, salary=? WHERE id=?;
-- DELETE
DELETE FROM employees WHERE id = ?;
```

## REST API

| Method | URL                  | Purpose          |
|--------|----------------------|------------------|
| GET    | /api/health          | Test DB connection |
| GET    | /api/employees       | List (`?search=`) |
| GET    | /api/employees/:id   | Get one          |
| POST   | /api/employees       | Create           |
| PUT    | /api/employees/:id   | Update           |
| DELETE | /api/employees/:id   | Delete           |

## Troubleshooting

- **RDS not connected / ETIMEDOUT** – RDS security group doesn't allow 3306 from the EC2 security group, or they're in different VPCs.
- **ER_ACCESS_DENIED_ERROR** – wrong user/password in `.env`.
- **ER_BAD_DB_ERROR** – you haven't run `schema.sql` yet.
- **Page not loading** – open port 3000 in the EC2 security group.

## Security notes

- Never commit `.env`. Prefer AWS Secrets Manager for production.
- Keep RDS **not publicly accessible**; only EC2 should reach it.
- Put nginx + HTTPS (Let's Encrypt / ALB) in front for real use, and add authentication before exposing the page publicly, since anyone with the URL can edit data.
