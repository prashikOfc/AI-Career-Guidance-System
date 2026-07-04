import json
from flask import Blueprint, request, jsonify
from app.database import get_db_connection, execute_query, fetch_all_dict, fetch_one_dict
from app.utils import check_admin_auth

admin_bp = Blueprint('admin', __name__)

# ADMIN STATS RETRIEVAL
@admin_bp.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    if not check_admin_auth():
        return jsonify({'error': 'Access Denied. Administrator role required.'}), 403
        
    conn = get_db_connection()
    try:
        cur_u = execute_query(conn, "SELECT COUNT(*) FROM users WHERE role = 'user'", "SELECT COUNT(*) FROM users WHERE role = 'user'")
        total_users = cur_u.fetchone()[0]
        
        # Exclude administrators from student assessments count
        cur_a = execute_query(conn, 
            "SELECT COUNT(*) FROM assessments WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin')", 
            "SELECT COUNT(*) FROM assessments WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin')"
        )
        total_assessments = cur_a.fetchone()[0]
        
        # Exclude administrators from student resume scans count
        cur_r = execute_query(conn, 
            "SELECT COUNT(*) FROM resume_scans WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin')", 
            "SELECT COUNT(*) FROM resume_scans WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin')"
        )
        total_scans = cur_r.fetchone()[0]
        
        # Exclude administrators from student chat history count
        cur_c = execute_query(conn, 
            "SELECT COUNT(*) FROM chat_history WHERE sender = 'user' AND user_email NOT IN (SELECT email FROM users WHERE role = 'admin')", 
            "SELECT COUNT(*) FROM chat_history WHERE sender = 'user' AND user_email NOT IN (SELECT email FROM users WHERE role = 'admin')"
        )
        total_chats = cur_c.fetchone()[0]
        
        conn.close()
        return jsonify({
            'users': total_users,
            'assessments': total_assessments,
            'resumes': total_scans,
            'chats': total_chats
        })
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# ADMIN USER DIRECTORY RETRIEVAL
@admin_bp.route('/api/admin/users', methods=['GET'])
def get_admin_users():
    if not check_admin_auth():
        return jsonify({'error': 'Access Denied. Administrator role required.'}), 403
        
    conn = get_db_connection()
    try:
        cur = execute_query(conn,
            "SELECT id, name, email, age, degree, gpa, role, created_at FROM users WHERE role = 'user' ORDER BY id DESC",
            "SELECT id, name, email, age, degree, gpa, role, created_at FROM users WHERE role = 'user' ORDER BY id DESC"
        )
        users = fetch_all_dict(cur)
        conn.close()
        return jsonify({'users': users})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# DELETE AN INDIVIDUAL USER AND ASSOCIATED DATA
@admin_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_admin_user(user_id):
    if not check_admin_auth():
        return jsonify({'error': 'Access Denied. Administrator role required.'}), 403
        
    conn = get_db_connection()
    try:
        cur = execute_query(conn,
            "SELECT email FROM users WHERE id = %s",
            "SELECT email FROM users WHERE id = ?",
            (user_id,)
        )
        user = fetch_one_dict(cur)
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        email = user['email']
        
        # Admin cannot delete their own account
        auth_header = request.headers.get('Authorization')
        admin_email = auth_header.split(' ')[1]
        if email == admin_email:
            conn.close()
            return jsonify({'error': 'Operation Denied. You cannot delete your own admin account.'}), 400
            
        # Delete user
        execute_query(conn,
            "DELETE FROM users WHERE id = %s",
            "DELETE FROM users WHERE id = ?",
            (user_id,)
        )
        # Delete other relations
        execute_query(conn, "DELETE FROM assessments WHERE user_email = %s", "DELETE FROM assessments WHERE user_email = ?", (email,))
        execute_query(conn, "DELETE FROM saved_careers WHERE user_email = %s", "DELETE FROM saved_careers WHERE user_email = ?", (email,))
        execute_query(conn, "DELETE FROM resume_scans WHERE user_email = %s", "DELETE FROM resume_scans WHERE user_email = ?", (email,))
        execute_query(conn, "DELETE FROM chat_history WHERE user_email = %s", "DELETE FROM chat_history WHERE user_email = ?", (email,))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'User and all related data purged.'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# UPDATE A USER'S ROLE SPECIFICATION
@admin_bp.route('/api/admin/users/<int:user_id>/role', methods=['POST'])
def change_user_role(user_id):
    if not check_admin_auth():
        return jsonify({'error': 'Access Denied. Administrator role required.'}), 403
        
    data = request.json
    new_role = data.get('role')
    if new_role not in ['user', 'admin']:
        return jsonify({'error': 'Invalid role specification'}), 400
        
    conn = get_db_connection()
    try:
        cur = execute_query(conn,
            "SELECT email FROM users WHERE id = %s",
            "SELECT email FROM users WHERE id = ?",
            (user_id,)
        )
        user = fetch_one_dict(cur)
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        email = user['email']
        
        # Admin cannot demote their own account
        auth_header = request.headers.get('Authorization')
        admin_email = auth_header.split(' ')[1]
        if email == admin_email and new_role == 'user':
            conn.close()
            return jsonify({'error': 'Operation Denied. Demoting your own admin account is forbidden.'}), 400
            
        execute_query(conn,
            "UPDATE users SET role = %s WHERE id = %s",
            "UPDATE users SET role = ? WHERE id = ?",
            (new_role, user_id)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'Role updated to {new_role}.'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# ADMIN ACCESS TO LOGGED ASSESSMENTS
@admin_bp.route('/api/admin/assessments', methods=['GET'])
def get_admin_assessments():
    if not check_admin_auth():
        return jsonify({'error': 'Access Denied. Administrator role required.'}), 403
        
    conn = get_db_connection()
    try:
        cur = execute_query(conn,
            "SELECT * FROM assessments WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin') ORDER BY id DESC",
            "SELECT * FROM assessments WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin') ORDER BY id DESC"
        )
        assessments = fetch_all_dict(cur)
        
        for a in assessments:
            cur_m = execute_query(conn,
                "SELECT career_name, match_percentage FROM assessment_matches WHERE assessment_id = %s ORDER BY match_percentage DESC",
                "SELECT career_name, match_percentage FROM assessment_matches WHERE assessment_id = ? ORDER BY match_percentage DESC",
                (a['id'],)
            )
            a['matches'] = fetch_all_dict(cur_m)
            a['interests'] = json.loads(a['interests']) if a['interests'] else []
            a['goals'] = json.loads(a['goals']) if a['goals'] else []
            
        conn.close()
        return jsonify({'assessments': assessments})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# ADMIN ACCESS TO LOGGED RESUME SCANS
@admin_bp.route('/api/admin/resume-scans', methods=['GET'])
def get_admin_scans():
    if not check_admin_auth():
        return jsonify({'error': 'Access Denied. Administrator role required.'}), 403
        
    conn = get_db_connection()
    try:
        cur = execute_query(conn,
            "SELECT * FROM resume_scans WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin') ORDER BY id DESC",
            "SELECT * FROM resume_scans WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin') ORDER BY id DESC"
        )
        scans = fetch_all_dict(cur)
        for rs in scans:
            rs['parsed_skills'] = json.loads(rs['parsed_skills']) if rs['parsed_skills'] else []
            rs['missing_skills'] = json.loads(rs['missing_skills']) if rs['missing_skills'] else []
            rs['improvements'] = json.loads(rs['improvements']) if rs['improvements'] else []
        conn.close()
        return jsonify({'scans': scans})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# ADMIN ACCESS TO LOGGED CHAT HISTORY
@admin_bp.route('/api/admin/chat-history', methods=['GET'])
def get_admin_chats():
    if not check_admin_auth():
        return jsonify({'error': 'Access Denied. Administrator role required.'}), 403
        
    conn = get_db_connection()
    try:
        cur = execute_query(conn,
            "SELECT id, user_email, sender, message, created_at FROM chat_history WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin') ORDER BY id DESC",
            "SELECT id, user_email, sender, message, created_at FROM chat_history WHERE user_email NOT IN (SELECT email FROM users WHERE role = 'admin') ORDER BY id DESC"
        )
        chats = fetch_all_dict(cur)
        conn.close()
        return jsonify({'chats': chats})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
