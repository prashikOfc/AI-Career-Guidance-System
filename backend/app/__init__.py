import os
from flask import Flask, jsonify
from flask_cors import CORS
from app.database import init_db, get_db_type, get_mysql_conn_error

def create_app():
    # Load environment variables from .env file manually if it exists
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#') and '=' in line:
                    key, val = line.strip().split('=', 1)
                    os.environ[key.strip()] = val.strip()

    app = Flask(__name__, static_folder='../../frontend', static_url_path='')
    CORS(app)

    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    # Register Blueprints using the absolute package path
    from app.blueprints.auth import auth_bp
    from app.blueprints.career import career_bp
    from app.blueprints.services import services_bp
    from app.blueprints.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(career_bp)
    app.register_blueprint(services_bp)
    app.register_blueprint(admin_bp)

    # Heartbeat Ping Status Endpoint
    @app.route('/api/status', methods=['GET'])
    def get_status():
        return jsonify({
            'status': 'online',
            'db_type': get_db_type(),
            'mysql_error': get_mysql_conn_error()
        })

    # Initialize Database (and perform migrations / default seeding)
    with app.app_context():
        init_db()

    return app
