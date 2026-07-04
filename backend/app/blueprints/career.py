import json
from flask import Blueprint, request, jsonify
from app.database import get_db_connection, execute_query
from werkzeug.security import generate_password_hash

career_bp = Blueprint('career', __name__)

# SAVE USER ASSESSMENT AND UPDATE PROFILE DETAILS
@career_bp.route('/api/assessments', methods=['POST'])
def save_assessment():
    data = request.json
    email = data.get('email')
    name = data.get('name')
    age = data.get('age')
    degree = data.get('degree')
    gpa = data.get('gpa')
    password = data.get('password') # optional if registering via wizard
    
    timestamp = data.get('timestamp')
    scores = data.get('userScores', {})
    interests = data.get('interests', [])
    goals = data.get('goals', [])
    matches = data.get('matches', [])
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    conn = get_db_connection()
    try:
        # Check user profile
        cur = execute_query(conn,
            "SELECT id FROM users WHERE email = %s",
            "SELECT id FROM users WHERE email = ?",
            (email,)
        )
        user_row = cur.fetchone()
        
        # If user doesn't exist, we auto-register them
        if not user_row:
            pw_hash = generate_password_hash(password if password else "password123")
            execute_query(conn,
                "INSERT INTO users (name, email, password_hash, role, age, degree, gpa) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                "INSERT INTO users (name, email, password_hash, role, age, degree, gpa) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (name, email, pw_hash, 'user', age, degree, gpa)
            )
        else:
            # Just update profile details
            execute_query(conn,
                "UPDATE users SET name=%s, age=%s, degree=%s, gpa=%s WHERE email=%s",
                "UPDATE users SET name=?, age=?, degree=?, gpa=? WHERE email=?",
                (name, age, degree, gpa, email)
            )
        
        # Save Assessment Info
        cur = execute_query(conn,
            "INSERT INTO assessments (user_email, timestamp, coding, design, writing, analysis, speaking, communication, aptitude, iq, interests, goals) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            "INSERT INTO assessments (user_email, timestamp, coding, design, writing, analysis, speaking, communication, aptitude, iq, interests, goals) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                email, timestamp, 
                scores.get('coding', 3), scores.get('design', 3), 
                scores.get('writing', 3), scores.get('analysis', 3), 
                scores.get('speaking', 3),
                scores.get('communication', 3), scores.get('aptitude', 3),
                scores.get('iq', 3),
                json.dumps(interests), json.dumps(goals)
            )
        )
        assessment_id = cur.lastrowid
        
        # Save matches
        for m in matches:
            execute_query(conn,
                "INSERT INTO assessment_matches (assessment_id, career_name, description, match_percentage, median_salary, growth_rate, courses, missing_skills) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                "INSERT INTO assessment_matches (assessment_id, career_name, description, match_percentage, median_salary, growth_rate, courses, missing_skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    assessment_id, m.get('name'), m.get('description'),
                    m.get('matchPercentage'), m.get('medianSalary'), m.get('growthRate'),
                    json.dumps(m.get('courses', [])), json.dumps(m.get('missingSkills', []))
                )
            )
            
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'assessment_id': assessment_id})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

# SAVE OR REMOVE SAVED CAREER PATHWAY
@career_bp.route('/api/saved-careers', methods=['POST', 'DELETE'])
def manage_saved_careers():
    data = request.json or request.args
    email = data.get('email')
    career_name = data.get('career_name')
    
    if not email or not career_name:
        return jsonify({'error': 'Email and career_name are required'}), 400
        
    conn = get_db_connection()
    try:
        if request.method == 'POST':
            execute_query(conn,
                "INSERT INTO saved_careers (user_email, career_name) VALUES (%s, %s) ON DUPLICATE KEY UPDATE career_name=career_name",
                "INSERT OR IGNORE INTO saved_careers (user_email, career_name) VALUES (?, ?)",
                (email, career_name)
            )
            msg = 'Career path saved successfully'
        else:
            execute_query(conn,
                "DELETE FROM saved_careers WHERE user_email = %s AND career_name = %s",
                "DELETE FROM saved_careers WHERE user_email = ? AND career_name = ?",
                (email, career_name)
            )
            msg = 'Career path removed successfully'
            
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': msg})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# SAVE METADATA LOG FOR COMPLETED RESUME SCANS
@career_bp.route('/api/resume-scans', methods=['POST'])
def save_resume_scan():
    data = request.json
    email = data.get('email')
    filename = data.get('filename')
    score = data.get('score')
    parsed_skills = data.get('parsed_skills', [])
    missing_skills = data.get('missing_skills', [])
    improvements = data.get('improvements', [])
    
    if not email or not filename or score is None:
        return jsonify({'error': 'Email, filename and score are required'}), 400
        
    conn = get_db_connection()
    try:
        execute_query(conn,
            "INSERT INTO resume_scans (user_email, filename, score, parsed_skills, missing_skills, improvements) VALUES (%s, %s, %s, %s, %s, %s)",
            "INSERT INTO resume_scans (user_email, filename, score, parsed_skills, missing_skills, improvements) VALUES (?, ?, ?, ?, ?, ?)",
            (email, filename, score, json.dumps(parsed_skills), json.dumps(missing_skills), json.dumps(improvements))
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Resume scan saved successfully'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
