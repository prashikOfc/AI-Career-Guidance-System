from flask import request
from app.database import get_db_connection, execute_query, fetch_one_dict
import pypdf
import docx

# Helper to check administrator credentials via Authorization header
def check_admin_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return False
    email = auth_header.split(' ')[1]
    
    conn = get_db_connection()
    cur = execute_query(conn,
        "SELECT role FROM users WHERE email = %s",
        "SELECT role FROM users WHERE email = ?",
        (email,)
    )
    user = fetch_one_dict(cur)
    conn.close()
    
    if user:
        return user['role'] == 'admin'
    return False

# Helper to extract text from files (PDF, DOCX, TXT)
def extract_text(file):
    filename = file.filename.lower()
    if filename.endswith('.pdf'):
        text = ""
        try:
            reader = pypdf.PdfReader(file.stream)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        except Exception as e:
            print("PDF parsing error:", e)
        return text
    elif filename.endswith('.docx'):
        text = ""
        try:
            doc = docx.Document(file.stream)
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            print("DOCX parsing error:", e)
        return text
    elif filename.endswith('.txt'):
        try:
            return file.stream.read().decode('utf-8', errors='ignore')
        except Exception as e:
            print("TXT reading error:", e)
            return ""
    return ""
