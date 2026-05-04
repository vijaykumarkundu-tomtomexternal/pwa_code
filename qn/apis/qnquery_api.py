# Contains /qnquery endpoint
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import json
import os
import numpy as np
import pandas as pd
import re
import base64
import mimetypes
import time
from pymongo import MongoClient
from langchain.schema import Document
from langchain.chains.question_answering import load_qa_chain
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from .common_imports import embeddings, llm, memory
import fitz  # PyMuPDF for PDF processing
from PIL import Image
import io
from constants import BP_DRAWINGS_PATH
from constants.database_constants import MONGO_URI, DATABASE_NAME, QN_INPUT_COLLECTION

qnquery_api = Blueprint('qnquery_api', __name__)

def load_image_as_base64(image_path):
    """
    Load an image                                # Check if this QN is in the embeddings
                                qn_found = False
                                for item in embedding_data.get('historical_qns_data', []):
                                    if str(item.get('qn_number', '')) == str(qn):
                                        qn_found = True
                                        breakand convert it to base64 string.
    """
    try:
        if os.path.exists(image_path):
            with open(image_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                # Get MIME type
                mime_type, _ = mimetypes.guess_type(image_path)
                if not mime_type:
                    mime_type = 'image/jpeg'  # Default fallback
                return f"data:{mime_type};base64,{encoded_string}"
        return None
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        return None

def extract_page_numbers_from_zone_location(zone_location):
    """
    Extract page numbers from zone location using regex.
    Examples: '5E-15' -> [15], '15-5E' -> [15], '6H-5;SHT' -> [5], '20-A3' -> [20]
    Gets pure numbers (without characters) that are either before or after the hyphen
    """
    try:
        print(f"Extracting page numbers from zone location: {zone_location}")
        
        # Split by hyphen to get parts before and after
        if '-' in zone_location:
            parts = zone_location.split('-')
            print(f"Split parts: {parts}")
            
            page_numbers = []
            
            for part in parts:
                # Extract pure numbers (digits only) from each part
                # This regex finds sequences of digits that are standalone numbers
                number_matches = re.findall(r'\b(\d+)\b', part)
                
                # Also check for numbers at start or end that might not have word boundaries
                if not number_matches:
                    # Try to find numbers that are not mixed with letters
                    standalone_numbers = re.findall(r'(?:^|[^A-Za-z])(\d+)(?:[^A-Za-z]|$)', part)
                    number_matches = standalone_numbers
                
                # Add pure numbers (filter out numbers that are part of alphanumeric codes)
                for match in number_matches:
                    # Double check that this number is not surrounded by letters
                    match_int = int(match)
                    # Only add if it's a reasonable page number (between 1 and 9999)
                    if 1 <= match_int <= 9999:
                        page_numbers.append(match_int)
            
            # Remove duplicates while preserving order
            page_numbers = list(dict.fromkeys(page_numbers))
            
        else:
            # If no hyphen, try to extract any standalone numbers
            page_numbers = []
            number_matches = re.findall(r'\b(\d+)\b', zone_location)
            for match in number_matches:
                match_int = int(match)
                if 1 <= match_int <= 9999:
                    page_numbers.append(match_int)
        
        print(f"Extracted page numbers: {page_numbers}")
        return page_numbers
        
    except Exception as e:
        print(f"Error extracting page numbers from '{zone_location}': {e}")
        return []

def convert_pdf_page_to_image(pdf_path, page_number):
    """
    Convert a specific page of PDF to image and return as base64.
    """
    try:
        print(f"Converting PDF page {page_number} from: {pdf_path}")
        
        if not os.path.exists(pdf_path):
            print(f"PDF file not found: {pdf_path}")
            return None
            
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Check if page number is valid (PyMuPDF uses 0-based indexing)
        if page_number < 1 or page_number > len(doc):
            print(f"Invalid page number {page_number}. PDF has {len(doc)} pages.")
            doc.close()
            return None
            
        # Get the specific page (convert to 0-based index)
        page = doc[page_number - 1]
        
        # Render page as image with high resolution
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        
        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        doc.close()
        
        print(f"Successfully converted page {page_number} to base64, length: {len(img_base64)}")
        return f"data:image/png;base64,{img_base64}"
        
    except Exception as e:
        print(f"Error converting PDF page {page_number} to image: {e}")
        return None

def get_bp_location_dynamic(qn, mqi, pdf_path=None):
    """
    Dynamic function to get BP location based on QN and MQI.
    1. Query qn_input collection for Zone Location
    2. Extract page numbers using regex
    3. Convert PDF page to image
    4. Return base64 image
    """
    try:
        print(f"Getting BP location for QN: {qn}, MQI: {mqi}")
        
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        input_collection = db[QN_INPUT_COLLECTION]
        
        # Query for QN and MQI
        query = {"QN": int(qn)}
        if mqi:
            query["MQI"] = mqi
            
        print(f"MongoDB query: {query}")
        qn_data = input_collection.find_one(query)
        
        if not qn_data:
            print(f"No data found for QN: {qn}, MQI: {mqi}")
            return None
            
        # Get Zone Location
        zone_location = qn_data.get("Zone Location", "")
        if not zone_location:
            print("No Zone Location found in the data")
            return None
            
        print(f"Found Zone Location: {zone_location}")
        
        # Extract page numbers
        page_numbers = extract_page_numbers_from_zone_location(zone_location)
        if not page_numbers:
            print("No valid page numbers found in Zone Location")
            return None
            
        # Use the first page number found
        page_number = page_numbers[0]
        
        # Default PDF path if not provided
        if not pdf_path:
            pdf_path = BP_DRAWINGS_PATH  # Adjust path as needed
            
        print(f"Using PDF path: {pdf_path}")
        
        # Convert PDF page to image
        image_base64 = convert_pdf_page_to_image(pdf_path, page_number)
        
        if image_base64:
            return {
                "image": image_base64,
                "zone_location": zone_location,
                "page_number": page_number,
                "pdf_path": pdf_path
            }
        else:
            return None
            
    except Exception as e:
        print(f"Error in get_bp_location_dynamic: {e}")
        return None

def check_for_peen_request(question):
    """
    Check if the question contains the word 'peen' in any case variation.
    Returns True if found, False otherwise.
    """
    # Define peen variations (case sensitive search)
    peen_variations = ['peen', 'Peen', 'PEEN', 'PeeN', 'peEN', 'PEeN', 'pEeN', 'pEeN']
    
    # Check for exact word matches (with word boundaries)
    for variation in peen_variations:
        # Use word boundaries to ensure we match the whole word
        if re.search(r'\b' + re.escape(variation) + r'\b', question):
            print(f"Found peen variation: {variation}")
            return True
    
    return False

def check_for_dimensional_limits_engine_manual(question):
    """
    Check if the question contains 'dimensional limits' and 'engine manual' using regex (case insensitive).
    Returns True if both terms are found, False otherwise.
    """
    question_lower = question.lower()
    
    # Define regex patterns for flexible matching
    dimensional_limits_pattern = r'\b(?:dimensional\s*limits?|dimension\s*limits?|dimensionallimits?)\b'
    engine_manual_pattern = r'\b(?:engine\s*manuals?|enginemanuals?)\b'
    
    # Check if both patterns exist in the question
    dimensional_match = re.search(dimensional_limits_pattern, question_lower)
    engine_match = re.search(engine_manual_pattern, question_lower)
    
    if dimensional_match and engine_match:
        print(f"Found dimensional limits pattern: {dimensional_match.group()}")
        print(f"Found engine manual pattern: {engine_match.group()}")
        return True
    
    return False

def check_for_sl_diagram_or_certification(question):
    """
    Check if the question contains variations of 'SL Diagram' or 'Certification' (case insensitive).
    Returns True if found, False otherwise.
    """
    question_lower = question.lower()
    
    # Define SL Diagram patterns (case insensitive)
    sl_diagram_patterns = [
        'sl diagram', 'sl-diagram', 'sldiagram', 'sl_diagram',
        'sl diagrams', 'sl-diagrams', 'sldiagrams', 'sl_diagrams'
    ]
    
    # Define Certification patterns (case insensitive)
    certification_patterns = [
        'certification', 'certifications', 'certificate', 'certificates',
        'cert', 'certs', 'certified', 'certify'
    ]
    
    # Check for SL Diagram patterns
    for pattern in sl_diagram_patterns:
        if pattern in question_lower:
            print(f"Found SL Diagram pattern: {pattern}")
            return True
    
    # Check for Certification patterns
    for pattern in certification_patterns:
        if pattern in question_lower:
            print(f"Found Certification pattern: {pattern}")
            return True
    
    return False

def check_predefined_responses(question):
    """
    Check if the question matches any predefined patterns and return appropriate response.
    Returns None if no predefined response is found.
    """
    # First check for peen request
    if check_for_peen_request(question):
        print("Peen request detected - returning fixed image path")
        return {
            "response": "Here is the peen-related diagram:",
            "response_type": "image_only",
            "image_path": r"D:\pwa\qn\bp_drawings_8th_image\page_012.png",
            "predefined": True,
            "peen_request": True
        }
    
    # Check for dimensional limits in engine manual request
    if check_for_dimensional_limits_engine_manual(question):
        print("Dimensional Limits in Engine Manual request detected - returning fixed image paths")
        return {
            "response": "Here are the Dimensional Limits from the Engine Manual:",
            "response_type": "image_only",
            "image_paths": [
                r"D:\pwa\qn\predefined_images_folder\img2.png",
                r"D:\pwa\qn\predefined_images_folder\img3.png"
            ],
            "predefined": True,
            "dimensional_limits_request": True
        }
    
    # Check for SL Diagram or Certification request
    if check_for_sl_diagram_or_certification(question):
        print("SL Diagram or Certification request detected - returning fixed image path")
        return {
            "response": "Here is the SL Diagram and Certification information:",
            "response_type": "image_only",
            "image_path": r"D:\pwa\qn\predefined_images_folder\SL_diagram.png",
            "predefined": True,
            "sl_diagram_request": True
        }
    
    # Convert question to lowercase for case-insensitive matching
    question_lower = question.lower()
    
    # Remove spaces and special characters for flexible matching
    question_normalized = re.sub(r'[^a-zA-Z0-9]', '', question_lower)
    
    # Define predefined responses with patterns
    predefined_responses = [
        {
            "patterns": ["bp location for mqi", "bplocation", "bp location mqi", "bp location", "blueprintlocation", "blue print location"],
            "response_text": "Here is the BP location information for the MQI:",
            "response_type": "image_with_text"
        }
        # {
        #     "patterns": ["airfoil", "air foil", "aerofoil", "aero foil"],
        #     "response_text": "Here is the airfoil diagram and specifications:",
        #     "image_path": "images/airfoil_diagram.jpg",
        #     "response_type": "image_with_text"
        # },
        # {
        #     "patterns": ["wing structure", "wingstructure", "wing design"],
        #     "response_text": "Wing structure details:",
        #     "image_path": "images/wing_structure.png",
        #     "response_type": "image_with_text"
        # },
        # {
        #     "patterns": ["defect codes", "defectcodes", "defect code list"],
        #     "response_text": "Here are the common defect codes:",
        #     "image_path": "images/defect_codes.jpg",
        #     "response_type": "image_with_text"
        # },
        # Add more predefined responses as needed
    ]
    
    # Check each predefined response
    for response_config in predefined_responses:
        for pattern in response_config["patterns"]:
            # Remove spaces from pattern for flexible matching
            pattern_normalized = re.sub(r'[^a-zA-Z0-9]', '', pattern.lower())
            
            # Check if pattern exists in the normalized question
            if pattern_normalized in question_normalized:
                print(f"Found predefined response for pattern: {pattern}")
                
                # Check if this is BP location request (needs dynamic processing)
                if any(bp_keyword in pattern.lower() for bp_keyword in ["bp location", "bplocation", "blueprintlocation", "blue print location"]):
                    print(f"BP location request detected for pattern: '{pattern}' - using dynamic function")
                    return {
                        "response": response_config["response_text"],
                        "response_type": response_config["response_type"],
                        "predefined": True,
                        "dynamic_bp_location": True  # Flag for dynamic processing
                    }
                
                # Load static image if specified
                image_base64 = None
                if response_config.get("image_path"):
                    image_base64 = load_image_as_base64(response_config["image_path"])
                
                return {
                    "response": response_config["response_text"],
                    "response_type": response_config["response_type"],
                    "image": image_base64,
                    "predefined": True
                }
    
    return None

def save_query_to_excel(qn, question, response, is_predefined=False):
    """
    Save the query and response to an Excel file for logging purposes.
    """
    try:
        # Define the Excel file path
        excel_file_path = "query_logs.xlsx"
        
        # Create a new record
        new_record = {
            'Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'QN': qn,
            'Question': question,
            'Response': response[:500] + "..." if len(str(response)) > 500 else response,  # Truncate long responses
            'Response_Type': 'Predefined' if is_predefined else 'AI_Generated'
        }
        
        # Check if file exists
        if os.path.exists(excel_file_path):
            # Load existing data
            try:
                df = pd.read_excel(excel_file_path)
            except Exception as e:
                print(f"Error reading existing Excel file: {e}")
                # Create new DataFrame if file is corrupted
                df = pd.DataFrame()
        else:
            # Create new DataFrame
            df = pd.DataFrame()
        
        # Append new record
        new_df = pd.DataFrame([new_record])
        df = pd.concat([df, new_df], ignore_index=True)
        
        # Save to Excel
        df.to_excel(excel_file_path, index=False, engine='openpyxl')
        print(f"Query log saved to {excel_file_path}")
        
    except Exception as e:
        print(f"Error saving query to Excel: {e}")
        # Don't raise exception to avoid breaking the API response

@qnquery_api.route('/qnquery', methods=['POST', 'OPTIONS'])
def general_query():
    if request.method == 'OPTIONS':
        return '', 200
    if request.method == 'POST':
        try:
            event = request.get_json()
            print(event)
 
            # Extract QN and question from the event payload
            qn = str(event["qn"])
            question = event["question"]
            print("QN:", qn)
            print("question:", question)
            
            # First check for predefined responses
            predefined_response = check_predefined_responses(question)
            if predefined_response:
                print("Using predefined response")
                
                # Add a small delay to make the response feel more natural
                time.sleep(30)  # 30 second delay for predefined responses
                
                # Check if this requires dynamic BP location processing
                if predefined_response.get("dynamic_bp_location"):
                    print("Processing dynamic BP location request")
                    
                    # Extract MQI from MongoDB or request (you may need to adjust this)
                    mqi = event.get("mqi")  # If MQI is passed in request
                    if not mqi:
                        # Try to get MQI from qn_input collection
                        try:
                            client = MongoClient(MONGO_URI)
                            db = client[DATABASE_NAME]
                            input_collection = db[QN_INPUT_COLLECTION]
                            qn_data = input_collection.find_one({"QN": int(qn)})
                            if qn_data:
                                mqi = qn_data.get("MQI")
                        except Exception as e:
                            print(f"Error fetching MQI: {e}")
                    
                    # Get dynamic BP location
                    bp_result = get_bp_location_dynamic(qn, mqi)
                    
                    if bp_result:
                        # Save predefined query to Excel log
                        save_query_to_excel(qn, question, predefined_response["response"], is_predefined=True)
                        
                        return jsonify({
                            "response": predefined_response["response"],
                            "response_type": predefined_response["response_type"],
                            "image": bp_result["image"],
                            "predefined": True,
                            "metadata": {
                                "qn": qn,
                                "question": question,
                                "response_source": "predefined_dynamic",
                                "zone_location": bp_result["zone_location"],
                                "page_number": bp_result["page_number"],
                                "pdf_path": bp_result["pdf_path"],
                                "mqi": mqi
                            }
                        })
                    else:
                        return jsonify({
                            "error": f"Could not generate BP location for QN {qn}, MQI {mqi}",
                            "suggestions": [
                                "Check if QN exists in qn_input collection",
                                "Verify Zone Location field contains valid page numbers",
                                "Ensure PDF file exists for the QN"
                            ]
                        }), 404
                
                # Handle peen request with fixed image path
                if predefined_response.get("peen_request"):
                    print("Processing peen request with fixed image path")
                    
                    # Load the fixed image using the existing function
                    image_path = predefined_response.get("image_path")
                    image_base64 = load_image_as_base64(image_path)
                    
                    if image_base64:
                        # Save predefined query to Excel log
                        save_query_to_excel(qn, question, predefined_response["response"], is_predefined=True)
                        
                        return jsonify({
                            "response": predefined_response["response"],
                            "response_type": predefined_response["response_type"],
                            "image": image_base64,
                            "predefined": True,
                            "metadata": {
                                "qn": qn,
                                "question": question,
                                "response_source": "predefined_peen",
                                "image_path": image_path
                            }
                        })
                    else:
                        return jsonify({
                            "error": f"Could not load peen image from path: {image_path}",
                            "suggestions": [
                                "Check if the image file exists at the specified path",
                                "Verify file permissions for the image file"
                            ]
                        }), 404
                
                # Handle dimensional limits in engine manual request with fixed image paths
                if predefined_response.get("dimensional_limits_request"):
                    print("Processing Dimensional Limits in Engine Manual request with fixed image paths")
                    
                    # Load multiple images using the existing function
                    image_paths = predefined_response.get("image_paths", [])
                    images_base64 = []
                    
                    for image_path in image_paths:
                        image_base64 = load_image_as_base64(image_path)
                        if image_base64:
                            images_base64.append(image_base64)
                        else:
                            print(f"Warning: Could not load image from path: {image_path}")
                    
                    if images_base64:
                        # Save predefined query to Excel log
                        save_query_to_excel(qn, question, predefined_response["response"], is_predefined=True)
                        
                        return jsonify({
                            "response": predefined_response["response"],
                            "response_type": predefined_response["response_type"],
                            "image": images_base64,  # Multiple images array with "image" key
                            "predefined": True,
                            "metadata": {
                                "qn": qn,
                                "question": question,
                                "response_source": "predefined_dimensional_limits",
                                "image_paths": image_paths,
                                "images_count": len(images_base64)
                            }
                        })
                    else:
                        return jsonify({
                            "error": f"Could not load any Dimensional Limits Engine Manual images from paths: {image_paths}",
                            "suggestions": [
                                "Check if the image files exist at the specified paths",
                                "Verify file permissions for the image files"
                            ]
                        }), 404
                
                # Handle SL Diagram or Certification request with fixed image path
                if predefined_response.get("sl_diagram_request"):
                    print("Processing SL Diagram or Certification request with fixed image path")
                    
                    # Load the fixed image using the existing function
                    image_path = predefined_response.get("image_path")
                    image_base64 = load_image_as_base64(image_path)
                    
                    if image_base64:
                        # Save predefined query to Excel log
                        save_query_to_excel(qn, question, predefined_response["response"], is_predefined=True)
                        
                        return jsonify({
                            "response": predefined_response["response"],
                            "response_type": predefined_response["response_type"],
                            "image": image_base64,
                            "predefined": True,
                            "metadata": {
                                "qn": qn,
                                "question": question,
                                "response_source": "predefined_sl_diagram",
                                "image_path": image_path
                            }
                        })
                    else:
                        return jsonify({
                            "error": f"Could not load SL Diagram image from path: {image_path}",
                            "suggestions": [
                                "Check if the image file exists at the specified path",
                                "Verify file permissions for the image file"
                            ]
                        }), 404
                
                # Handle regular predefined responses (non-dynamic)
                # Save predefined query to Excel log
                save_query_to_excel(qn, question, predefined_response["response"], is_predefined=True)
                
                return jsonify({
                    "response": predefined_response["response"],
                    "response_type": predefined_response["response_type"],
                    "image": predefined_response.get("image"),
                    "predefined": True,
                    "metadata": {
                        "qn": qn,
                        "question": question,
                        "response_source": "predefined"
                    }
                })
            
            # If no predefined response, continue with normal AI processing
            print("No predefined response found, proceeding with AI processing...")
            
            # Load context from text file instead of embeddings
            print("Loading business context from text file...")
            
            project_dir = os.path.dirname(os.path.dirname(__file__))
            context_dir = os.path.join(project_dir, "context_files")
            context_file_path = os.path.join(context_dir, f"qn_{qn}_context.txt")
            
            vectordb1 = None
            context_content = ""
            
            # Try to load context file for this QN
            try:
                if os.path.exists(context_file_path):
                    with open(context_file_path, 'r', encoding='utf-8') as f:
                        context_content = f.read()
                    
                    print(f"Loaded context file: {context_file_path}")
                    print(f"Context file size: {len(context_content)} characters")
                    
                    # Create document-like objects for the chain from the context
                    vectordb1 = []
                    
                    # Split context into sections (current QN and historical QNs)
                    sections = context_content.split("=== HISTORICAL QN CONTEXT")
                    current_qn_section = sections[0] if sections else ""
                    historical_section = sections[1] if len(sections) > 1 else ""
                    
                    # Add current QN context as first document
                    if current_qn_section.strip():
                        doc = Document(
                            page_content=current_qn_section.strip(),
                            metadata={
                                "qn": qn,
                                "type": "current_qn",
                                "source": "context_file"
                            }
                        )
                        vectordb1.append(doc)
                    
                    # Split historical context by QN sections
                    if historical_section.strip():
                        qn_sections = historical_section.split("--- Historical QN ")
                        
                        for section in qn_sections:
                            if section.strip() and "---" in section:
                                # Extract QN number from section header
                                qn_match = re.search(r'^(\d+)', section)
                                historical_qn = qn_match.group(1) if qn_match else "unknown"
                                
                                doc = Document(
                                    page_content=section.strip(),
                                    metadata={
                                        "qn": historical_qn,
                                        "type": "historical_qn",
                                        "source": "context_file"
                                    }
                                )
                                vectordb1.append(doc)
                    
                    print(f"Created {len(vectordb1)} documents from context file")
                    
                else:
                    print(f"Context file not found: {context_file_path}")
                    
            except Exception as e:
                print(f"Error loading context file: {e}")
            
            # If we still have no results, return an error
            if vectordb1 is None or len(vectordb1) == 0:
                return jsonify({
                    "error": f"No business context found for QN {qn}. Please run the /search_qn endpoint first to generate context.",
                    "suggestions": [
                        f"Use the /search_qn endpoint for QN {qn} to generate business context",
                        f"Ensure the context file exists at {context_file_path}",
                        "Make sure the QN has been analyzed using search_qn before querying"
                    ]
                }), 404
            
            print(f"Using {len(vectordb1)} context documents for question answering")
            
            # Fetch current QN data to provide context
            current_qn_data = None
            try:
                # Connect to MongoDB to get current QN data
                client = MongoClient(MONGO_URI)
                db = client[DATABASE_NAME]
                input_collection = db[QN_INPUT_COLLECTION]
                
                current_qn_data = input_collection.find_one({"QN": int(qn)})
                if current_qn_data:
                    print(f"Found current QN data for QN {qn}")
                    # Convert ObjectId to string for processing
                    current_qn_data['_id'] = str(current_qn_data['_id'])
                else:
                    print(f"No current QN data found for QN {qn}")
            except Exception as e:
                print(f"Error fetching current QN data: {e}")
            
            # Determine the context source for the template
            context_source = "business context files"
            
            # Prepare the prompt template with current QN context
            current_qn_context = ""
            if current_qn_data:
                current_qn_context = f"""
CURRENT QN INFORMATION (QN {qn}):
QN: {current_qn_data.get('QN', '')}
Part Number: {current_qn_data.get('Part Number', '')}
MQI: {current_qn_data.get('MQI', '')}
Long Text: {current_qn_data.get('Long Text', '')}
Short Text: {current_qn_data.get('Short Text', '')}
Defect Code: {current_qn_data.get('Defect Code', '')}
Drawing Revision: {current_qn_data.get('Drawing Revision', '')}
Status: {current_qn_data.get('status', '')}

"""
            
            template = f"""You are an expert technical assistant that provides direct answers to specific questions.
 
            INSTRUCTIONS:
            1. Answer ONLY the specific question asked
            2. Use ONLY relevant information from the context that directly relates to the question
            3. Do not provide additional information beyond what is specifically asked
            4. Be precise, confident, and concise
            5. Focus exclusively on answering the exact question - nothing more, nothing less
           
            {current_qn_context}Context from {context_source}:
            {{context}}
           
            Question: {{question}}
            Direct Answer:"""
           
            prompt = PromptTemplate(
                input_variables=["question", "context"], template=template)          
           
            # Create the chain and get response
            chain1 = load_qa_chain(llm=llm, chain_type="stuff", memory=memory, prompt=prompt)
            response = chain1.run({"input_documents": vectordb1, "question": question})
            
            print("Response:", response)
            
            # Save query and response to Excel log
            save_query_to_excel(qn, question, response, is_predefined=False)
            
            return jsonify({
                "response": response,
                "response_type": "text",
                "predefined": False,
                "metadata": {
                    "qn": qn,
                    "documents_used": len(vectordb1),
                    "context_source": "business_context_files",
                    "question": question,
                    "response_source": "ai_generated"
                }
            })
           
        except Exception as e:
            print(f"Error in general_query: {str(e)}")
            return jsonify({
                "error": f"An error occurred while processing the query: {str(e)}",
                "qn": event.get("qn") if 'event' in locals() else None
            }), 500
