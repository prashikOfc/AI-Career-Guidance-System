import os
import sqlite3
from werkzeug.security import generate_password_hash

# Database Configurations
MYSQL_HOST = 'localhost'
MYSQL_USER = 'root'
MYSQL_PASSWORD = ''
MYSQL_DATABASE = 'guidance_ai'
SQLITE_FILE = 'guidance_ai.db'

db_type = 'sqlite'  # 'mysql' or 'sqlite'
mysql_conn_error = None

# Connect to Database
def get_db_connection():
    global db_type, mysql_conn_error
    
    # Try MySQL first
    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DATABASE}")
        conn.close()
        
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE
        )
        db_type = 'mysql'
        mysql_conn_error = None
        return conn
    except Exception as e:
        mysql_conn_error = str(e)
        db_type = 'sqlite'
        conn = sqlite3.connect(SQLITE_FILE)
        conn.row_factory = sqlite3.Row
        return conn

def get_db_type():
    global db_type
    return db_type

def get_mysql_conn_error():
    global mysql_conn_error
    return mysql_conn_error

# Helper for executing queries with correct placeholders
def execute_query(conn, query_mysql, query_sqlite, params=()):
    cursor = conn.cursor()
    query = query_mysql if db_type == 'mysql' else query_sqlite
    cursor.execute(query, params)
    return cursor

# Helper to fetch dictionary rows
def fetch_all_dict(cursor):
    if db_type == 'mysql':
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    else:
        return [dict(row) for row in cursor.fetchall()]

# Helper to fetch a single dictionary row
def fetch_one_dict(cursor):
    row = cursor.fetchone()
    if not row:
        return None
    if db_type == 'mysql':
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    else:
        return dict(row)

# Database Tables Setup & Automatic Migrations
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Dynamic Migrations Check for users
    users_table_exists = False
    if db_type == 'mysql':
        cursor.execute("SHOW TABLES LIKE 'users'")
        users_table_exists = len(cursor.fetchall()) > 0
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        users_table_exists = len(cursor.fetchall()) > 0
        
    if users_table_exists:
        # Check columns to see if password_hash or role needs to be appended
        columns = []
        if db_type == 'mysql':
            cursor.execute("SHOW COLUMNS FROM users")
            columns = [row[0] for row in cursor.fetchall()]
        else:
            cursor.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in cursor.fetchall()]
            
        if 'password_hash' not in columns:
            alter_type = 'VARCHAR(255) NOT NULL DEFAULT ""' if db_type == 'mysql' else 'TEXT NOT NULL DEFAULT ""'
            cursor.execute(f"ALTER TABLE users ADD COLUMN password_hash {alter_type}")
        if 'role' not in columns:
            alter_type = 'VARCHAR(20) DEFAULT "user"' if db_type == 'mysql' else 'TEXT DEFAULT "user"'
            cursor.execute(f"ALTER TABLE users ADD COLUMN role {alter_type}")
        conn.commit()

    # Dynamic Migrations Check for assessments
    assessments_table_exists = False
    if db_type == 'mysql':
        cursor.execute("SHOW TABLES LIKE 'assessments'")
        assessments_table_exists = len(cursor.fetchall()) > 0
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='assessments'")
        assessments_table_exists = len(cursor.fetchall()) > 0
        
    if assessments_table_exists:
        columns = []
        if db_type == 'mysql':
            cursor.execute("SHOW COLUMNS FROM assessments")
            columns = [row[0] for row in cursor.fetchall()]
        else:
            cursor.execute("PRAGMA table_info(assessments)")
            columns = [row[1] for row in cursor.fetchall()]
            
        if 'communication' not in columns:
            alter_type = 'INT DEFAULT 3' if db_type == 'mysql' else 'INTEGER DEFAULT 3'
            cursor.execute(f"ALTER TABLE assessments ADD COLUMN communication {alter_type}")
        if 'aptitude' not in columns:
            alter_type = 'INT DEFAULT 3' if db_type == 'mysql' else 'INTEGER DEFAULT 3'
            cursor.execute(f"ALTER TABLE assessments ADD COLUMN aptitude {alter_type}")
        if 'iq' not in columns:
            alter_type = 'INT DEFAULT 3' if db_type == 'mysql' else 'INTEGER DEFAULT 3'
            cursor.execute(f"ALTER TABLE assessments ADD COLUMN iq {alter_type}")
        conn.commit()

    # Create tables
    if db_type == 'mysql':
        print("[DB INIT] Running in MySQL mode")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          age INT NOT NULL,
          degree VARCHAR(100) NOT NULL,
          gpa VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_email VARCHAR(150) NOT NULL,
          timestamp VARCHAR(50) NOT NULL,
          coding INT NOT NULL,
          design INT NOT NULL,
          writing INT NOT NULL,
          analysis INT NOT NULL,
          speaking INT NOT NULL,
          communication INT DEFAULT 3,
          aptitude INT DEFAULT 3,
          iq INT DEFAULT 3,
          interests TEXT NOT NULL,
          goals TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessment_matches (
          id INT AUTO_INCREMENT PRIMARY KEY,
          assessment_id INT NOT NULL,
          career_name VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          match_percentage INT NOT NULL,
          median_salary INT NOT NULL,
          growth_rate INT NOT NULL,
          courses TEXT NOT NULL,
          missing_skills TEXT NOT NULL,
          FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_careers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_email VARCHAR(150) NOT NULL,
          career_name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_career (user_email, career_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS resume_scans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_email VARCHAR(150) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          score INT NOT NULL,
          parsed_skills TEXT NOT NULL,
          missing_skills TEXT NOT NULL,
          improvements TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_email VARCHAR(150) NOT NULL,
          sender VARCHAR(10) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)
    else:
        print(f"[DB INIT] Running in SQLite mode (MySQL error: {mysql_conn_error})")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          age INTEGER NOT NULL,
          degree TEXT NOT NULL,
          gpa TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          coding INTEGER NOT NULL,
          design INTEGER NOT NULL,
          writing INTEGER NOT NULL,
          analysis INTEGER NOT NULL,
          speaking INTEGER NOT NULL,
          communication INTEGER DEFAULT 3,
          aptitude INTEGER DEFAULT 3,
          iq INTEGER DEFAULT 3,
          interests TEXT NOT NULL,
          goals TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessment_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          assessment_id INTEGER NOT NULL,
          career_name TEXT NOT NULL,
          description TEXT NOT NULL,
          match_percentage INTEGER NOT NULL,
          median_salary INTEGER NOT NULL,
          growth_rate INTEGER NOT NULL,
          courses TEXT NOT NULL,
          missing_skills TEXT NOT NULL,
          FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_careers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          career_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_email, career_name)
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS resume_scans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          filename TEXT NOT NULL,
          score INTEGER NOT NULL,
          parsed_skills TEXT NOT NULL,
          missing_skills TEXT NOT NULL,
          improvements TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          sender TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
    
    conn.commit()
    conn.close()

    # Seed Default Administrator
    seed_default_admin()

def seed_default_admin():
    conn = get_db_connection()
    cur = execute_query(conn,
        "SELECT * FROM users WHERE email = %s",
        "SELECT * FROM users WHERE email = ?",
        ('admin@guidance.ai',)
    )
    admin_exists = cur.fetchone()
    if not admin_exists:
        print("[DB INIT] Seeding default administrator account (admin@guidance.ai / admin123)")
        admin_pw_hash = generate_password_hash("admin123")
        execute_query(conn,
            "INSERT INTO users (name, email, password_hash, role, age, degree, gpa) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            "INSERT INTO users (name, email, password_hash, role, age, degree, gpa) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ('System Administrator', 'admin@guidance.ai', admin_pw_hash, 'admin', 30, 'Staff', 'N/A')
        )
        conn.commit()
    conn.close()
