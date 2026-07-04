import os
import json
import urllib.request
import urllib.error
from flask import Blueprint, request, jsonify
from app.database import get_db_connection, execute_query, fetch_all_dict
from app.utils import extract_text

services_bp = Blueprint('services', __name__)

# CHAT MESSAGES LOGGING (GET & POST)
@services_bp.route('/api/chat', methods=['GET', 'POST'])
def handle_chat():
    if request.method == 'GET':
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        conn = get_db_connection()
        cur = execute_query(conn,
            "SELECT sender, message FROM chat_history WHERE user_email = %s ORDER BY id ASC",
            "SELECT sender, message FROM chat_history WHERE user_email = ? ORDER BY id ASC",
            (email,)
        )
        chats = fetch_all_dict(cur)
        conn.close()
        return jsonify({'chats': chats})
        
    data = request.json
    email = data.get('email')
    message = data.get('message')
    bot_response = data.get('bot_response')
    
    if not email or not message or not bot_response:
        return jsonify({'error': 'Email, message and bot_response are required'}), 400
        
    conn = get_db_connection()
    try:
        execute_query(conn,
            "INSERT INTO chat_history (user_email, sender, message) VALUES (%s, %s, %s)",
            "INSERT INTO chat_history (user_email, sender, message) VALUES (?, ?, ?)",
            (email, 'user', message)
        )
        execute_query(conn,
            "INSERT INTO chat_history (user_email, sender, message) VALUES (%s, %s, %s)",
            "INSERT INTO chat_history (user_email, sender, message) VALUES (?, ?, ?)",
            (email, 'bot', bot_response)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

# MACHINE LEARNING RESUME SCANNER & SCORER VIA GEMINI
@services_bp.route('/api/resume/scan', methods=['POST'])
def resume_scan_ml():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    filename = file.filename
    ext = filename.split('.')[-1].lower()
    if ext not in ['pdf', 'docx', 'txt']:
        return jsonify({'error': 'Unsupported file format. Please upload a PDF, DOCX, or TXT file.'}), 400
        
    # Extract text from the file stream using utils helper
    text = extract_text(file)
    if not text or len(text.strip()) < 100:
        return jsonify({'error': 'The uploaded file does not contain enough extractable text to be a valid resume.'}), 400
        
    # Call Gemini to check if it's a resume and score it
    api_key = os.environ.get('GEMINI_API_KEY') 
    if not api_key:
        return jsonify({'error': 'API_KEY_NOT_CONFIGURED', 'message': 'Gemini API key is not configured.'}), 500

    system_instruction = (
        "You are an expert AI Resume Classifier and ATS Scoring engine. "
        "Analyze the text of the provided document and determine if it represents a professional resume or CV.\n\n"
        "1. Classification check: If the document is NOT a resume (e.g., it is a bank statement, random receipt, academic code file, general article, book chapter, letter, table of random numbers), set \"is_resume\" to false.\n"
        "2. ATS Scoring: If it is a resume, evaluate it carefully to produce an accurate ATS score (0 to 100). Identify key parsed skills found in the text, list missing critical skills for their career target, and suggest 3 actionable improvements.\n\n"
        "You must output ONLY a valid JSON object. Do not wrap it in markdown backticks or include any other text. Format:\n"
        "{\n"
        "  \"is_resume\": true/false,\n"
        "  \"score\": 85, // integer 0-100\n"
        "  \"parsed_skills\": [\"Skill1\", \"Skill2\", ...],\n"
        "  \"missing_skills\": [\"Missing1\", \"Missing2\", ...],\n"
        "  \"improvements\": [\"Actionable point 1\", \"Actionable point 2\", \"Actionable point 3\"]\n"
        "}"
    )
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{
            "role": "user",
            "parts": [{"text": f"Document text:\n\n{text}"}]
        }],
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            bot_text = res_data['candidates'][0]['content']['parts'][0]['text']
            
            bot_text = bot_text.strip()
            if bot_text.startswith("```json"):
                bot_text = bot_text[7:]
            if bot_text.endswith("```"):
                bot_text = bot_text[:-3]
            bot_text = bot_text.strip()
            
            result = json.loads(bot_text)
            
            if not result.get('is_resume', False):
                return jsonify({
                    'error': 'INVALID_RESUME_CONTENT',
                    'message': 'The uploaded document does not appear to be a valid professional resume. Please upload a correct resume file.'
                }), 400
                
            return jsonify({
                'success': True,
                'score': result.get('score', 75),
                'skills': result.get('parsed_skills', []),
                'missing': result.get('missing_skills', []),
                'improvements': result.get('improvements', [])
            })
    except urllib.error.HTTPError as he:
        err_msg = he.read().decode('utf-8')
        print(f"[Resume Gemini API Error] HTTP Error: {he.code} - {err_msg}", flush=True)
        return jsonify({'error': 'GEMINI_API_ERROR', 'message': f"Gemini HTTP Error {he.code}"}), 500
    except Exception as e:
        print(f"[Resume Gemini API Error] {str(e)}", flush=True)
        return jsonify({'error': 'SCAN_ERROR', 'message': str(e)}), 500

# CHAT COUNSELOR RESPONDER VIA GEMINI
@services_bp.route('/api/chat/respond', methods=['POST'])
def chat_respond():
    data = request.json or {}
    message = data.get('message')
    email = data.get('email')
    if not message:
        return jsonify({'error': 'Message is required'}), 400
        
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({
            'success': False,
            'error': 'API_KEY_NOT_CONFIGURED',
            'message': 'Gemini API key is not configured in the server environment.'
        }), 200
        
    system_instruction = (
        "You are the Guidance AI Counselor, a highly professional, empathetic, and expert career guidance advisor "
        "built by Space AI for the Guidance AI platform. \n\n"
        "CRITICAL RULES:\n"
        "1. Persona: You must ALWAYS refer to yourself as the 'Guidance AI Counselor' created by Space AI. Under NO "
        "circumstances should you mention 'Gemini', 'Google', 'OpenAI', 'ChatGPT', or any other underlying AI model or tech company.\n"
        "2. Tone: Enthusiastic, supportive, professional, and highly educational.\n"
        "3. Response Structure: Provide extremely helpful, actionable, and structured advice. Use markdown bolding, bullet "
        "points, and numbered lists to organize complex topics. Always suggest relevant, concrete steps (e.g., specific technologies "
        "to learn, resume keywords to add, or types of projects to build).\n"
        "4. Context: You guide students in matching their interests to modern career options, mapping academic paths, building technical, "
        "creative, or leadership skills, and preparing ATS-compatible resumes."
    )
    
    contents = []
    
    # Retrieve past chat history from DB for this user to maintain context
    if email:
        conn = get_db_connection()
        try:
            cur = execute_query(conn,
                "SELECT sender, message FROM chat_history WHERE user_email = %s ORDER BY id DESC LIMIT 12",
                "SELECT sender, message FROM chat_history WHERE user_email = ? ORDER BY id DESC LIMIT 12",
                (email,)
            )
            rows = fetch_all_dict(cur)
            conn.close()
            
            # Reverse DESC order to be chronological
            rows = list(reversed(rows))
            for row in rows:
                sender = row['sender']
                msg_val = row['message']
                
                contents.append({
                    "role": "user" if sender == "user" else "model",
                    "parts": [{"text": msg_val}]
                })
        except Exception as db_err:
            print(f"[DB Error fetching history] {str(db_err)}")
            if conn:
                conn.close()
                
    # Append the current message
    contents.append({
        "role": "user",
        "parts": [{"text": message}]
    })
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            bot_text = res_data['candidates'][0]['content']['parts'][0]['text']
            return jsonify({
                'success': True,
                'response': bot_text
            })
    except urllib.error.HTTPError as he:
        err_msg = he.read().decode('utf-8')
        print(f"[Gemini API Error] HTTP Error: {he.code} - {err_msg}", flush=True)
        return jsonify({'success': False, 'error': f"Gemini API HTTP Error {he.code}"}), 500
    except Exception as e:
        print(f"[Gemini API Error] {str(e)}", flush=True)
        return jsonify({'success': False, 'error': str(e)}), 500
