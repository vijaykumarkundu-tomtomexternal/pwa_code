# Contains /getfile/<path:filename> endpoint
from flask import Blueprint, request, send_file, jsonify
import os
import tempfile
import zipfile
from pathlib import Path
import base64
import sys
import mimetypes
from werkzeug.utils import secure_filename

getfile_api = Blueprint('getfile_api', __name__)

@getfile_api.route('/getfile/test', methods=['GET'])
def test_getfile():
    """Test endpoint to verify the API is working"""
    return jsonify({
        "status": "API is working",
        "timestamp": str(os.path.getctime(__file__)),
        "available_methods": ["GET"],
        "parameters": {
            "filepath": "required - path to the file"
        }
    }), 200

def convert_pptx_to_images(pptx_path):
    """
    Convert PowerPoint slides to images using win32com
    Works for both .pptx and .ppt files
    Returns list of base64 encoded images
    """
    try:
        # Check if images already exist
        pptx_dir = os.path.dirname(pptx_path)
        pptx_name = Path(pptx_path).stem
        images_dir = os.path.join(pptx_dir, f"{pptx_name}_images")
        
        # If images directory exists and contains images, return existing images
        if os.path.exists(images_dir):
            existing_images = []
            image_files = sorted([f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
            
            if image_files:
                print(f"Found existing images for {pptx_name}, using cached images")
                for i, img_file in enumerate(image_files):
                    img_path = os.path.join(images_dir, img_file)
                    with open(img_path, "rb") as img_file_obj:
                        img_base64 = base64.b64encode(img_file_obj.read()).decode('utf-8')
                        # Determine image format from file extension
                        img_format = "png" if img_file.lower().endswith('.png') else "jpeg"
                        existing_images.append({
                            'slide_number': i + 1,
                            'image_data': f"data:image/{img_format};base64,{img_base64}",
                            'cached': True
                        })
                return existing_images
        
        # Try to import required libraries
        try:
            from pptx import Presentation
            print("python-pptx imported successfully")
        except ImportError as e:
            print(f"python-pptx not available: {e}")
            return [{"error": "python-pptx library not installed", "message": "Please install python-pptx to convert PowerPoint files"}]
        
        # Try win32com approach first
        try:
            import win32com.client
            import pythoncom
            print("win32com available, using COM automation")
            
            # Initialize COM
            pythoncom.CoInitialize()
            
            # Create images directory for caching
            os.makedirs(images_dir, exist_ok=True)
            
            try:
                # Create PowerPoint application
                powerpoint = win32com.client.Dispatch("PowerPoint.Application")
                # Don't set Visible to 0, leave it as default or set to 1
                powerpoint.Visible = 1
                powerpoint.DisplayAlerts = 0  # Disable alerts
                
                # Open presentation
                presentation = powerpoint.Presentations.Open(os.path.abspath(pptx_path), ReadOnly=True)
                
                images = []
                # Export each slide as image
                for i in range(1, presentation.Slides.Count + 1):
                    slide = presentation.Slides(i)
                    slide_path = os.path.join(images_dir, f"slide_{i}.png")
                    
                    # Export slide as PNG
                    slide.Export(slide_path, "PNG", 1920, 1080)
                    
                    # Convert to base64
                    with open(slide_path, "rb") as img_file:
                        img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
                        images.append({
                            'slide_number': i,
                            'image_data': f"data:image/png;base64,{img_base64}",
                            'cached': False
                        })
                
                # Close presentation and application
                presentation.Close()
                powerpoint.Quit()
                
                # Clean up COM
                pythoncom.CoUninitialize()
                
                return images
                
            except Exception as com_error:
                print(f"COM automation error: {com_error}")
                # Clean up COM even if there's an error
                try:
                    if 'presentation' in locals():
                        presentation.Close()
                    if 'powerpoint' in locals():
                        powerpoint.Quit()
                    pythoncom.CoUninitialize()
                except:
                    pass
                raise com_error
                
        except ImportError:
            print("win32com not available, trying alternative method")
            
        except Exception as e:
            print(f"COM automation failed: {e}")
            # Try alternative approach without COM
        
        # Fallback: Return a message that conversion is not available
        return [{
            "error": "PowerPoint conversion not available", 
            "message": "Please install win32com (pywin32) for PowerPoint conversion on Windows (.ppt and .pptx files)",
            "fallback": "File will be downloaded instead"
        }]
        
    except Exception as e:
        print(f"Error in convert_pptx_to_images: {str(e)}")
        return [{"error": f"Conversion failed: {str(e)}"}]

@getfile_api.route('/getfile', methods=['GET'])
def getfile():
    try:
        filepath = request.args.get('filepath')
        print(f"Requested file: {filepath}")
        
        # Check if filepath parameter exists
        if not filepath:
            print("No filepath parameter provided")
            return jsonify({"error": "No filepath parameter provided"}), 400
        
        # Check if file exists
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            return jsonify({"error": "File not found", "filepath": filepath}), 404
        
        # Get file extension
        file_ext = Path(filepath).suffix.lower()
        print(f"File extension: {file_ext}")
        
        # Handle PowerPoint files (both .pptx and .ppt)
        if file_ext in ['.pptx', '.ppt']:
            print("Processing PowerPoint file...")
            try:
                images = convert_pptx_to_images(filepath)
                print(f"Conversion result: {type(images)}, Length: {len(images) if images else 'None'}")
                
                if images:
                    # Check if it's an error response
                    if isinstance(images, list) and len(images) > 0 and isinstance(images[0], dict) and 'error' in images[0]:
                        print(f"Conversion returned error: {images[0]}")
                        return jsonify({
                            "type": "powerpoint_conversion_failed",
                            "filename": os.path.basename(filepath),
                            "error": images[0],
                            "fallback_available": True
                        }), 200
                    else:
                        # Successful conversion
                        print("Returning converted images")
                        return jsonify({
                            "type": "powerpoint_images",
                            "filename": os.path.basename(filepath),
                            "slides": images,
                            "slide_count": len(images)
                        }), 200
                else:
                    print("No images returned from conversion")
                    return jsonify({
                        "type": "powerpoint_conversion_failed",
                        "filename": os.path.basename(filepath),
                        "error": {"error": "No images generated"},
                        "fallback_available": True
                    }), 200
                
            except Exception as e:
                print(f"Exception during PowerPoint processing: {str(e)}")
                import traceback
                traceback.print_exc()
                return jsonify({
                    "type": "powerpoint_error", 
                    "filename": os.path.basename(filepath),
                    "error": f"Processing error: {str(e)}",
                    "fallback_available": True
                }), 200
        
        # Handle other file types normally
        print("Sending file as attachment...")
        return send_file(filepath, as_attachment=True)
        
    except Exception as e:
        print(f"General exception in getfile: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@getfile_api.route('/download', methods=['GET'])
def download_file():
    """
    Download file endpoint that accepts filepath as query parameter
    
    Usage: GET /download?filepath=/path/to/file
    
    Returns the file as an attachment for download
    """
    try:
        # Get filepath from query parameters
        filepath = request.args.get('filepath')
        
        # Validate filepath parameter
        if not filepath:
            return jsonify({"error": "Missing 'filepath' query parameter"}), 400
        
        # Security check: ensure filepath is a string
        if not isinstance(filepath, str):
            return jsonify({"error": "Filepath must be a string"}), 400
        
        # Check if file exists
        if not os.path.exists(filepath):
            return jsonify({
                "error": "File not found", 
                "filepath": filepath
            }), 404
        
        # Check if it's actually a file (not a directory)
        if not os.path.isfile(filepath):
            return jsonify({
                "error": "Path is not a file", 
                "filepath": filepath
            }), 400
        
        # Get file information
        filename = os.path.basename(filepath)
        file_size = os.path.getsize(filepath)
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(filepath)
        
        print(f"Downloading file: {filename} ({file_size} bytes)")
        
        # Send file as attachment
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype=mime_type
        )
        
    except PermissionError:
        return jsonify({
            "error": "Permission denied", 
            "message": "No permission to access the file"
        }), 403
    
    except Exception as e:
        print(f"Error in download_file: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"Server error: {str(e)}"
        }), 500
