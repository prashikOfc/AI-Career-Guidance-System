import json
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import get_db_connection, execute_query, fetch_one_dict, fetch_all_dict

auth_bp = Blueprint('auth', __name__)

# AUTHENTICATION: REGISTER
@auth_bp.route('/api/register', methods=['POST'])
def register_user():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    age = data.get('age', 21)
    degree = data.get('degree', 'Bachelor\'s')
    gpa = data.get('gpa', 'N/A')

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400

    conn = get_db_connection()
    try:
        # Check if email exists
        cur = execute_query(conn,
            "SELECT id FROM users WHERE email = %s",
            "SELECT id FROM users WHERE email = ?",
            (email,)
        )
        if cur.fetchone():
            conn.close()
            return jsonify({'error': 'Email is already registered. Please Sign In instead.'}), 400

        pw_hash = generate_password_hash(password)
        execute_query(conn,
            "INSERT INTO users (name, email, password_hash, role, age, degree, gpa) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            "INSERT INTO users (name, email, password_hash, role, age, degree, gpa) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name, email, pw_hash, 'user', age, degree, gpa)
        )
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'session': {
                'email': email,
                'name': name,
                'role': 'user',
                'token': f"session-{email}"
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# AUTHENTICATION: LOGIN
@auth_bp.route('/api/login', methods=['POST'])
def login_user():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    conn = get_db_connection()
    try:
        cur = execute_query(conn,
            "SELECT * FROM users WHERE email = %s",
            "SELECT * FROM users WHERE email = ?",
            (email,)
        )
        user = fetch_one_dict(cur)
        conn.close()

        if not user:
            return jsonify({'error': 'User profile does not exist. Please Register.'}), 400

        if not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Incorrect email or password.'}), 401

        return jsonify({
            'success': True,
            'session': {
                'email': user['email'],
                'name': user['name'],
                'role': user['role'],
                'token': f"session-{user['email']}"
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# AUTHENTICATION: PROFILE & HISTORY SYNC
@auth_bp.route('/api/sync', methods=['POST'])
def sync_user():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    conn = get_db_connection()
    cur = execute_query(conn, 
        "SELECT id, name, email, age, degree, gpa, role FROM users WHERE email = %s",
        "SELECT id, name, email, age, degree, gpa, role FROM users WHERE email = ?",
        (email,)
    )
    user = fetch_one_dict(cur)
    if not user:
        conn.close()
        return jsonify({'exists': False, 'message': 'User profile does not exist'})
    
    # Fetch Assessments History
    cur = execute_query(conn,
        "SELECT * FROM assessments WHERE user_email = %s ORDER BY id DESC",
        "SELECT * FROM assessments WHERE user_email = ? ORDER BY id DESC",
        (email,)
    )
    assessments = fetch_all_dict(cur)
    
    for a in assessments:
        cur_m = execute_query(conn,
            "SELECT * FROM assessment_matches WHERE assessment_id = %s ORDER BY match_percentage DESC",
            "SELECT * FROM assessment_matches WHERE assessment_id = ? ORDER BY match_percentage DESC",
            (a['id'],)
        )
        a['matches'] = fetch_all_dict(cur_m)
        a['interests'] = json.loads(a['interests']) if a['interests'] else []
        a['goals'] = json.loads(a['goals']) if a['goals'] else []
        for m in a['matches']:
            m['courses'] = json.loads(m['courses']) if m['courses'] else []
            m['missing_skills'] = json.loads(m['missing_skills']) if m['missing_skills'] else []
            
    # Fetch Saved Careers
    cur = execute_query(conn,
        "SELECT career_name FROM saved_careers WHERE user_email = %s ORDER BY created_at DESC",
        "SELECT career_name FROM saved_careers WHERE user_email = ? ORDER BY created_at DESC",
        (email,)
    )
    saved_careers = [r[0] for r in cur.fetchall()]
    
    # Fetch Resume Scans
    cur = execute_query(conn,
        "SELECT * FROM resume_scans WHERE user_email = %s ORDER BY id DESC",
        "SELECT * FROM resume_scans WHERE user_email = ? ORDER BY id DESC",
        (email,)
    )
    resume_scans = fetch_all_dict(cur)
    for rs in resume_scans:
        rs['parsed_skills'] = json.loads(rs['parsed_skills']) if rs['parsed_skills'] else []
        rs['missing_skills'] = json.loads(rs['missing_skills']) if rs['missing_skills'] else []
        rs['improvements'] = json.loads(rs['improvements']) if rs['improvements'] else []
        
    # Fetch Chat History
    cur = execute_query(conn,
        "SELECT sender, message FROM chat_history WHERE user_email = %s ORDER BY id ASC",
        "SELECT sender, message FROM chat_history WHERE user_email = ? ORDER BY id ASC",
        (email,)
    )
    chat_history = fetch_all_dict(cur)
    
    conn.close()
    
    return jsonify({
        'exists': True,
        'user': user,
        'assessments': assessments,
        'saved_careers': saved_careers,
        'resume_scans': resume_scans,
        'chat_history': chat_history
    })
