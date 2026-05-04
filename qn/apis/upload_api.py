# Contains /qnupload endpoint
from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
import os
import uuid
import glob
from datetime import datetime
from pymongo import MongoClient
from .common_imports import (
    COLUMN_MAPPING, find_matching_column, map_dataframe_to_schema,
    safe_str_convert, safe_int_convert, safe_float_convert
)
from constants import QN_INPUTS_PATH
from constants.database_constants import MONGO_URI, DATABASE_NAME, QN_INPUT_COLLECTION

upload_api = Blueprint('upload_api', __name__)

def find_qn_documents(qn_number):
    """
    Search for all QN documents in QN_INPUTS_PATH.
    Returns a dictionary with primary document (docx) and additional files.
    """
    try:
        qn_str = str(qn_number)
        
        # Search in QN_INPUTS_PATH
        base_search_path = QN_INPUTS_PATH
        
        if not os.path.exists(base_search_path):
            return {"qn_source": None, "additional_files": []}
        
        # Look for QN folder patterns
        qn_patterns = [
            f"QN{qn_str}",
            f"QN{qn_str}*",
            f"*QN{qn_str}*",
            f"{qn_str}",
            f"*{qn_str}*"
        ]
        
        primary_document = None
        additional_files = []
        
        for pattern in qn_patterns:
            search_pattern = os.path.join(base_search_path, pattern)
            matching_folders = glob.glob(search_pattern)
            
            for folder_path in matching_folders:
                if os.path.isdir(folder_path):
                    # Get all files in the folder
                    all_files = glob.glob(os.path.join(folder_path, "*"))
                    
                    for file_path in all_files:
                        if os.path.isfile(file_path):
                            filename = os.path.basename(file_path)
                            file_ext = os.path.splitext(filename)[1].lower()
                            
                            # Check if this is the primary QN document (exact QN number.docx)
                            if filename == f"{qn_str}.docx":
                                primary_document = file_path
                            
                            # Collect all other relevant files
                            elif file_ext in ['.pdf', '.msg', '.todd', '.doc', '.txt', '.xlsx', '.xls']:
                                additional_files.append({
                                    "filename": filename,
                                    "filepath": file_path,
                                    "filetype": file_ext[1:]  # Remove the dot
                                })
        
        # Also try looking directly in the base path
        direct_path = os.path.join(base_search_path, f"{qn_str}.docx")
        if os.path.exists(direct_path) and not primary_document:
            primary_document = direct_path
        
        return {
            "qn_source": primary_document,
            "additional_files": additional_files
        }
        
    except Exception as e:
        print(f"Error searching for QN {qn_number} documents: {str(e)}")
        return {"qn_source": None, "additional_files": []}

@upload_api.route('/qnupload', methods=['POST'])
def upload_and_insert():
    try:
        temp_file_path = None
       
        # Handle both file uploads and JSON requests with file paths
        if 'file' in request.files:
            # Direct file upload
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
           
            # Save uploaded file temporarily in local directory
            import tempfile
            import os
            upload_dir = "uploads"
            if not os.path.exists(upload_dir):
                os.makedirs(upload_dir)
           
            # Save file with original name in uploads directory
            temp_file_path = os.path.join(upload_dir, file.filename)
            file.save(temp_file_path)
           
        elif request.is_json:
            # JSON request with file path
            data = request.get_json()
            if 'file' not in data:
                return jsonify({'error': 'No file path provided in JSON'}), 400
            temp_file_path = data["file"]
        else:
            return jsonify({'error': 'No file provided'}), 400
       
       
        # Read Excel or CSV file
        try:
            if temp_file_path.lower().endswith('.csv'):
                df = pd.read_csv(temp_file_path)
            else:
                # Try reading Excel file normally first
                df = pd.read_excel(temp_file_path)
               
                # Check if we need to skip rows (common in Excel files)
                if len(df.columns) < 3 or df.iloc[0].isna().sum() > len(df.columns) * 0.5:
                    df = pd.read_excel(temp_file_path, skiprows=1)
                   
                if len(df.columns) < 3 or df.iloc[0].isna().sum() > len(df.columns) * 0.5:
                    df = pd.read_excel(temp_file_path, skiprows=2)
        
           
        except Exception as e:
            return jsonify({'error': f'Failed to read file: {str(e)}'}), 400
       
        # Map the dataframe to the required schema
        mapped_df = map_dataframe_to_schema(df)

       
        # Convert DataFrame to JSON-serializable format
        mapped_data = mapped_df.to_dict(orient='records')
       
        # Clean and convert data for JSON serialization
        for record in mapped_data:
            for key, value in record.items():
                if pd.isna(value) or value is None:
                    record[key] = None
                elif isinstance(value, (pd.Timestamp, datetime)):
                    record[key] = value.strftime('%Y-%m-%d %H:%M:%S') if value else ""
                elif isinstance(value, (np.int64, np.float64)):
                    record[key] = value.item() if not pd.isna(value) else None
       
        # Connect to MongoDB qn_db.qn_input
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        collection = db[QN_INPUT_COLLECTION]
       
        inserted = 0
        skipped = 0
        errors = []
       
        for index, record in enumerate(mapped_data):
            try:
                # Check for required fields - QN is mandatory
                if not record.get("QN") or record["QN"] is None or record["QN"] == "":
                    errors.append(f"Row {index + 1}: QN is required but missing")
                    continue
 
                qn = int(float(record["QN"]))  # Handle both int and float QN values
 
                # Check for QN uniqueness
                if collection.find_one({"QN": qn}):
                    skipped += 1
                    continue
 
                # Use 'Part Number' for DB consistency
                part_number = record.get("Part No")
                
                # Search for QN documents in predefined folders
                qn_documents = find_qn_documents(qn)
                qn_document_path = qn_documents["qn_source"]
                additional_files = qn_documents["additional_files"]
                
                doc = {
                    # Your 17 required columns in order:
                    "Item": safe_int_convert(record.get("Item")),                      # Item number
                    "QN": qn,                                                          # Notification  
                    "SN": safe_str_convert(record.get("SN")),                         # Item Serial Number
                    "Short Text": safe_str_convert(record.get("Short Text")),         # Item text(Short Text)
                    "Defect Code": safe_str_convert(record.get("Defect Code")),       # Damage Code
                    "Issue date": safe_str_convert(record.get("Issue date")),         # Created On
                    "Part Number": safe_str_convert(part_number),                     # Material
                    "MQI": safe_str_convert(record.get("MQI")),                      # MQI Number
                    "Vendor Code": safe_str_convert(record.get("Vendor Code")),       # Vendor Code
                    "Vendor": safe_str_convert(record.get("Vendor Name")),       # List name (Vendor Name)
                    "Rev": safe_str_convert(record.get("Rev")),                       # Engineering Chng Num
                    "Zone Location": safe_str_convert(record.get("Zone Location")),   # Zone Location
                    "Long Text": safe_str_convert(record.get("Long Text")),           # Defect long text
                    
                    # Additional system fields:
                    "Received date": safe_str_convert(record.get("Received date")) or datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "Non Conformance": safe_str_convert(record.get("Non Conformance")) or "Dimensional",
                    "actual": safe_float_convert(record.get("actual")),
                    "status": "Open",
                    "created_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "recommendation": "",
                    "analyse_date": "",
                    "accept_date": "",
                    "reject_date": "",
                    "id": str(uuid.uuid4())
                }
                
                # Add qn_source field with primary document file path if found
                if qn_document_path:
                    doc["qn_source"] = qn_document_path
                else:
                    doc["qn_source"] = None
                
                # Add additional files as a list
                if additional_files:
                    doc["additional_files"] = additional_files
                else:
                    doc["additional_files"] = []
 
                # Insert the document
                collection.insert_one(doc)
                inserted += 1
 
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                continue
       
        # Clean up uploaded file if it was uploaded via form
        if 'file' in request.files and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass  # Don't fail if cleanup fails
       
        # Prepare response
        response_data = {
            'message': f'Upload complete. Inserted: {inserted}, Skipped (duplicate QN): {skipped}',
            'inserted': inserted,
            'skipped': skipped,
            'errors': errors[:10] if errors else [],  # Limit error messages to first 10
            'total_processed': len(mapped_data),
            'file_processed': temp_file_path,
            'original_columns': list(df.columns),  # Show original columns for debugging
            'mapped_columns': list(mapped_df.columns) if 'mapped_df' in locals() else [],
            'column_mapping_found': {
                field: find_matching_column(df.columns, field) for field in COLUMN_MAPPING.keys()
            }
        }
       
        if errors:
            response_data['total_errors'] = len(errors)
           
        return jsonify(response_data), 200
       
    except Exception as e:
        # Clean up file on error
        if 'temp_file_path' in locals() and temp_file_path and 'file' in request.files and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
