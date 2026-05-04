from flask import Flask
from flask_cors import CORS
import sys
import os
import argparse

# Add the current directory to Python path for relative imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import all Blueprints
try:
    from apis.upload_api import upload_api
    from apis.qnfilepath_api import qnfilepath_api
    from apis.qndownload_api import qndownload_api
    from apis.menu_api import menu_api
    from apis.track_api import track_api
    from apis.getfile_api import getfile_api
    from apis.email_api import email_api
    from apis.mqi_counts_by_part_api import mqi_counts_by_part_api
    from apis.search_qn_api import search_qn_api
    from apis.qnquery_api import qnquery_api
    print("All API modules imported successfully")
except ImportError as e:
    print(f"Import error: {e}")
    print("Some API modules may not be working correctly")

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000","http://172.191.176.69:3000", "http://localhost:5000", "http://172.19.192.203:5060","http://172.19.192.242:8800"])

# Register all Blueprints
try:
    app.register_blueprint(upload_api)
    app.register_blueprint(qnfilepath_api)
    app.register_blueprint(qndownload_api)
    app.register_blueprint(menu_api)
    app.register_blueprint(track_api)
    app.register_blueprint(getfile_api)
    app.register_blueprint(email_api)
    app.register_blueprint(mqi_counts_by_part_api)
    app.register_blueprint(search_qn_api)
    app.register_blueprint(qnquery_api)
    print("All API blueprints registered successfully")
except Exception as e:
    print(f"Blueprint registration error: {e}")


@app.route('/')
def health_check():
    return {"status": "QN API Server is running", "endpoints": [
        "/qnupload", "/qnfilepath",
        "/qndownload", "/menu", "/track", "/getfile/<filename>", 
        "/email", "/mqi_counts_by_part", "/search_qn", "/qnquery"
    ]}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run QN API Server')
    parser.add_argument('--production', action='store_true', 
                       help='Run with production WSGI server (Waitress)')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8070, help='Port to bind to')
    
    args = parser.parse_args()
    
    print("Starting QN API Server...")
    
    if args.production:
        print("Running in production mode with Waitress server...")
        try:
            from waitress import serve
            serve(app, host=args.host, port=args.port, threads=4)
        except ImportError:
            print("Waitress not installed. Install with: pip install waitress")
            print("Falling back to Flask development server...")
            app.run(host=args.host, port=args.port, debug=False, threaded=True, use_reloader=False)
    else:
        print("Running in development mode...")
        # Use threaded=True to fix Windows socket issues
        # Set use_reloader=False to prevent double startup
        app.run(host=args.host, port=args.port, debug=True, threaded=True, use_reloader=False)
