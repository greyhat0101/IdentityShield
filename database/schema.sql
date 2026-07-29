 CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scanned_email TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    risk_score INTEGER DEFAULT 0,
    breach_count INTEGER DEFAULT 0,
    breached_sites TEXT,
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS breach_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    breach_name TEXT NOT NULL,
    breach_date TEXT,
    breach_desc TEXT,
    data_exposed TEXT,
    FOREIGN KEY (scan_id) REFERENCES scan_history(id)
);

CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    status_code INTEGER,
    response_time REAL,
    called_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS contact_queries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL,
    subject     TEXT NOT NULL,
    message     TEXT NOT NULL,
    status      TEXT DEFAULT 'unread',
    sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_reply TEXT,
    replied_at  TIMESTAMP,
    delivery_status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id)
);
