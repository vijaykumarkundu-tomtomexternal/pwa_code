# Contains /qnfilepath endpoint
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from pymongo import MongoClient
from constants.database_constants import MONGO_URI, DATABASE_NAME, QN_INPUT_COLLECTION
from constants.file_constants import QN_OUTPUTS_PATH, QN_INPUTS_PATH, POWERPOINT_EXTENSIONS
import os
import re
import shutil

qnfilepath_api = Blueprint('qnfilepath_api', __name__)

def find_disposition_summary_files_for_qn(base_path: str, qn_number: str) -> dict:
    """
    Search for PowerPoint files with 'Disposition_summary' or 'Recommendation_Summary' pattern 
    for a specific QN in Design and Disk_STR subfolders.
    
    Args:
        base_path (str): Base path containing Design and Disk_STR folders
        qn_number (str): Specific QN number to search for
        
    Returns:
        Dict: Dictionary with 'design' and 'structure' keys containing file info
    """
    disposition_files = {}
    
    try:
        if not os.path.exists(base_path):
            print(f"Base path does not exist: {base_path}")
            return disposition_files
            
        # Search in Design and Disk_STR folders
        folder_mappings = {
            'Design': 'design',
            'Disk_STR': 'structure'
        }
        
        for folder_name, key in folder_mappings.items():
            folder_path = os.path.join(base_path, folder_name)
            
            if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
                print(f"Warning: {folder_name} folder not found at {folder_path}")
                continue
            
            print(f"Searching in {folder_name} folder for QN {qn_number}")
            
            # Look for QN folders within Design or Disk_STR
            for qn_folder_name in os.listdir(folder_path):
                qn_folder_path = os.path.join(folder_path, qn_folder_name)
                
                if not os.path.isdir(qn_folder_path):
                    continue
                
                # Extract QN number from folder name
                qn_match = re.search(r'QN(\d+)', qn_folder_name)
                if not qn_match:
                    continue
                    
                found_qn_number = qn_match.group(1)
                
                # Only process if this is the QN we're looking for
                if found_qn_number != qn_number:
                    continue
                
                print(f"  Found QN folder: {qn_folder_name} in {folder_name}")
                
                # Search for disposition summary files recursively
                found_files = []
                
                def search_recursive(directory_path, depth=0):
                    indent = "    " + "  " * depth
                    try:
                        for item_name in os.listdir(directory_path):
                            item_path = os.path.join(directory_path, item_name)
                            
                            if os.path.isfile(item_path):
                                # Check if it's a PPT file with the right pattern
                                if (('Disposition_summary' in item_name or 'Recommendation_Summary' in item_name) and 
                                    any(item_name.lower().endswith(ext) for ext in POWERPOINT_EXTENSIONS)):
                                    found_files.append((item_name, directory_path))
                                    print(f"{indent}Found disposition file: {item_name}")
                            elif os.path.isdir(item_path):
                                search_recursive(item_path, depth + 1)
                    except PermissionError:
                        print(f"{indent}Permission denied: {directory_path}")
                    except Exception as e:
                        print(f"{indent}Error searching {directory_path}: {e}")
                
                # Start recursive search
                search_recursive(qn_folder_path)
                
                if found_files:
                    # Get the latest version file (if multiple exist)
                    file_names = [file_info[0] for file_info in found_files]
                    latest_file = get_latest_version_file(file_names)
                    
                    if latest_file:
                        # Find the full path for the latest file
                        latest_file_path = None
                        for file_name, file_dir in found_files:
                            if file_name == latest_file:
                                latest_file_path = os.path.join(file_dir, latest_file)
                                break
                        
                        if latest_file_path:
                            disposition_files[key] = {
                                "filename": latest_file,
                                "filepath": latest_file_path,
                                "source": folder_name
                            }
                            print(f"    Selected {latest_file} from {folder_name} for QN {qn_number}")
                
                break  # Found the QN folder, no need to continue searching in this main folder
                    
    except Exception as e:
        print(f"Error finding disposition files for QN {qn_number}: {str(e)}")
        
    return disposition_files

def get_latest_version_file(file_list: list) -> str:
    """
    Get the latest version file from a list of disposition summary files.
    Priority: Higher version number (V3 > V2 > V1) > no version suffix
    
    Args:
        file_list (List[str]): List of disposition summary filenames
        
    Returns:
        Optional[str]: Latest version filename or None if list is empty
    """
    if not file_list:
        return None
        
    if len(file_list) == 1:
        return file_list[0]
    
    versioned_files = []
    base_files = []
    
    for file_name in file_list:
        # Check for various version patterns
        version_patterns = [
            r'_V(\d+)(?=\.|$)',      # _V1, _V2, etc.
            r'V(\d+)(?=\.|$)',       # V1, V2, etc.
            r'_v(\d+)(?=\.|$)',      # _v1, _v2, etc.
            r'v(\d+)(?=\.|$)',       # v1, v2, etc.
            r'_(\d+)(?=\.|$)'        # _1, _2, etc.
        ]
        
        version_found = False
        for pattern in version_patterns:
            version_match = re.search(pattern, file_name, re.IGNORECASE)
            if version_match:
                version_num = int(version_match.group(1))
                versioned_files.append((file_name, version_num))
                version_found = True
                break
        
        if not version_found:
            base_files.append(file_name)
    
    # Return the file with the highest version number
    if versioned_files:
        latest_versioned = max(versioned_files, key=lambda x: x[1])
        return latest_versioned[0]
    
    # If no versioned files, return the first base file
    if base_files:
        return base_files[0]
    
    return None

def copy_files_to_input_folder(qn_number: str, disposition_files: dict, design_flag: bool = False, structures_flag: bool = False) -> dict:
    """
    Copy disposition files to the input folder within QN_INPUTS_PATH based on flags.
    
    Args:
        qn_number (str): QN number
        disposition_files (dict): Dictionary with design/structure file info
        design_flag (bool): Whether to copy design files
        structures_flag (bool): Whether to copy structure files
        
    Returns:
        dict: Dictionary with copied file paths
    """
    copied_files = {}
    
    try:
        # Create input directory path for this QN
        qn_input_dir = os.path.join(QN_INPUTS_PATH, f"QN{qn_number}")
        os.makedirs(qn_input_dir, exist_ok=True)
        
        # Define which file types to process based on flags
        files_to_process = {}
        if design_flag and 'design' in disposition_files:
            files_to_process['design'] = disposition_files['design']
        if structures_flag and 'structure' in disposition_files:
            files_to_process['structure'] = disposition_files['structure']
        
        for file_type, file_info in files_to_process.items():
            if file_info and 'filepath' in file_info and 'filename' in file_info:
                source_path = file_info['filepath']
                filename = file_info['filename']
                
                if os.path.exists(source_path):
                    # Create destination filename with type prefix
                    dest_filename = f"{file_type}_{filename}"
                    dest_path = os.path.join(qn_input_dir, dest_filename)
                    
                    # Copy the file
                    shutil.copy2(source_path, dest_path)
                    
                    copied_files[f"qn_output_{file_type}"] = dest_path
                    print(f"✓ Copied {file_type} file: {filename} to {dest_path}")
                else:
                    print(f"✗ Source file not found: {source_path}")
                    
    except Exception as e:
        print(f"Error copying files to input folder: {str(e)}")
        
    return copied_files

@qnfilepath_api.route('/qnfilepath', methods=['POST'])
def update_qn_status():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        status = data.get("status")
        qn_number = data.get("qn")
        feedback = data.get("feedback")
        historyQNId = data.get("historyQNId")
        
        # Extract design and structures flags
        design_flag = data.get("design", False)
        structures_flag = data.get("structures", False)
        
        if not all([status, qn_number, feedback]):
            return jsonify({"error": "Missing required fields: status, qn, feedback"}), 400
        
        # MongoDB connection
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        collection = db[QN_INPUT_COLLECTION]
        
        # Find the QN record
        qn_filter = {"QN": int(qn_number)}
        existing_record = collection.find_one(qn_filter)
        
        if not existing_record:
            return jsonify({"error": f"QN {qn_number} not found"}), 404
        
        # Prepare update data
        current_datetime = datetime.now(timezone.utc)
        timestamp = current_datetime.strftime('%Y-%m-%d %H:%M:%S')
        
        update_data = {
            "status": status,
            "recommendation": feedback,
            "last_updated": timestamp,
            "historyQNId": historyQNId,
            "updated_by": "qnfilepath_api"  # Add identifier to track updates
        }
        
        # Set appropriate date fields based on status
        if status.lower() == "accept":
            update_data["accept_date"] = timestamp
            update_data["reject_date"] = ""
        elif status.lower() == "reject":
            update_data["reject_date"] = timestamp
            update_data["accept_date"] = ""
        else:
            # For other statuses, clear both dates
            update_data["accept_date"] = ""
            update_data["reject_date"] = ""
        
        # Process PPT files only for accept/reject status and based on flags
        disposition_file_paths = {}
        if status.lower() in ["accept", "reject"] and (design_flag or structures_flag):
            try:
                print(f"Processing disposition files for QN {qn_number} with status {status}")
                print(f"Flags - design: {design_flag}, structures: {structures_flag}")
                
                # Find disposition summary files for this QN
                disposition_files = find_disposition_summary_files_for_qn(QN_OUTPUTS_PATH, str(qn_number))
                
                if disposition_files:
                    print(f"Found disposition files: {disposition_files}")
                    
                    # Copy files to input folder based on flags
                    copied_files = copy_files_to_input_folder(
                        str(qn_number), 
                        disposition_files, 
                        design_flag, 
                        structures_flag
                    )
                    
                    # Add file paths to update data
                    for key, path in copied_files.items():
                        update_data[key] = path
                        disposition_file_paths[key] = path
                    
                    # Initialize empty paths for files not requested
                    if not design_flag:
                        update_data["qn_output_design"] = ""
                    if not structures_flag:
                        update_data["qn_output_structure"] = ""
                    
                    print(f"Successfully processed {len(copied_files)} disposition files")
                else:
                    print(f"No disposition files found for QN {qn_number}")
                    # Set empty paths if no files found
                    update_data["qn_output_design"] = ""
                    update_data["qn_output_structure"] = ""
                    
            except Exception as e:
                print(f"Error processing disposition files for QN {qn_number}: {str(e)}")
                # Continue with status update even if file processing fails
                update_data["qn_output_design"] = ""
                update_data["qn_output_structure"] = ""
                update_data["file_processing_error"] = str(e)
        elif status.lower() in ["accept", "reject"]:
            # If accept/reject but no flags set, initialize empty paths
            update_data["qn_output_design"] = ""
            update_data["qn_output_structure"] = ""
            print(f"No design/structures flags set for QN {qn_number}, skipping file processing")
        
        # Update the record using $set to only update specified fields
        print(f"Updating QN {qn_number} with data: {update_data}")
        result = collection.update_one(
            qn_filter,
            {"$set": update_data}
        )
        print(f"Update result - matched: {result.matched_count}, modified: {result.modified_count}")
        
        # Verify the update by fetching the record again
        updated_record = collection.find_one(qn_filter)
        print(f"Updated record status: {updated_record.get('status') if updated_record else 'Record not found'}")
        
        if result.modified_count > 0:
            response_data = {
                "success": True,
                "message": f"QN {qn_number} status updated successfully",
                "updated_fields": update_data,
                "qn": qn_number,
                "flags_processed": {
                    "design": design_flag,
                    "structures": structures_flag
                },
                "verification": {
                    "current_status": updated_record.get('status') if updated_record else None
                }
            }
            
            # Add disposition file info to response if files were processed
            if disposition_file_paths:
                response_data["disposition_files"] = disposition_file_paths
                response_data["message"] += f" and {len(disposition_file_paths)} disposition files copied"
            
            print(f"QN {qn_number} updated successfully with status: {status}")
            return jsonify(response_data), 200
        else:
            return jsonify({
                "success": False,
                "message": "No changes made to the record"
            }), 200
            
    except ValueError as e:
        return jsonify({"error": f"Invalid QN number format: {str(e)}"}), 400
    except Exception as e:
        print(f"Error updating QN status: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
    finally:
        # Ensure MongoDB connection is closed
        try:
            client.close()
        except:
            pass
