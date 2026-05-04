# Contains /search_qn endpoint
from flask import Blueprint, request, jsonify, current_app
import json
import os
import re
from datetime import datetime
from pymongo import MongoClient
from constants import SEARCH_PATH
from constants.database_constants import MONGO_URI, DATABASE_NAME, QN_HISTORICAL_COLLECTION, QN_INPUT_COLLECTION, QN_DOCUMENTS_COLLECTION

search_qn_api = Blueprint('search_qn_api', __name__)

def find_disposition_summary_files(base_path: str, target_qns: list = None) -> dict:
    """
    Search for PowerPoint files with 'Disposition_summary' or 'Recommendation_Summary' pattern in Design and Disk_STR subfolders.
    First searches in Design and Disk_STR folders, then looks for QN folders within those subfolders.
    Performs recursive search through all subdirectories to find PPT files at any depth.
    If multiple versions exist, select the latest version (V3 > V2 > V1).
    
    Args:
        base_path (str): Base path containing Design and Disk_STR folders
        target_qns (List[str], optional): Specific QN numbers to search for (e.g., ['5002787754', '5002802227'])
        
    Returns:
        Dict[str, list]: Dictionary mapping QN numbers to list of file info from Design and Disk_STR folders
    """
    disposition_files = {}
    
    try:
        if not os.path.exists(base_path):
            return disposition_files
            
        # First level: Search in Design and Disk_STR folders
        main_subfolders = ['Design', 'Disk_STR']
        
        for main_subfolder in main_subfolders:
            main_subfolder_path = os.path.join(base_path, main_subfolder)
            
            if not os.path.exists(main_subfolder_path) or not os.path.isdir(main_subfolder_path):
                print(f"Warning: {main_subfolder} folder not found at {main_subfolder_path}")
                continue
            
            print(f"Searching in {main_subfolder} folder: {main_subfolder_path}")
            
            # Second level: Get all QN folders within Design or Disk_STR
            for qn_folder_name in os.listdir(main_subfolder_path):
                qn_folder_path = os.path.join(main_subfolder_path, qn_folder_name)
                
                if not os.path.isdir(qn_folder_path):
                    continue
                
                # Extract QN number from folder name
                qn_match = re.search(r'QN(\d+)', qn_folder_name)
                if not qn_match:
                    continue
                    
                qn_number = qn_match.group(1)
                
                # If target QNs specified, only process those folders
                if target_qns and qn_number not in target_qns:
                    continue
                
                print(f"  Checking QN folder: {qn_folder_name} (QN: {qn_number}) in {main_subfolder}")
                
                # Search for disposition summary files in this QN folder and its subdirectories
                found_files = []
                
                # First, search directly in the QN folder
                for file_name in os.listdir(qn_folder_path):
                    file_full_path = os.path.join(qn_folder_path, file_name)
                    if (os.path.isfile(file_full_path) and
                        ('Disposition_summary' in file_name or 'Recommendation_Summary' in file_name) and 
                        (file_name.lower().endswith('.ppt') or file_name.lower().endswith('.pptx'))):
                        found_files.append((file_name, qn_folder_path))
                        print(f"    Found disposition file (direct): {file_name}")
                
                # Search recursively in all subdirectories
                def search_recursive(directory_path, depth=0):
                    indent = "    " + "  " * depth
                    try:
                        for item_name in os.listdir(directory_path):
                            item_path = os.path.join(directory_path, item_name)
                            
                            if os.path.isfile(item_path):
                                # Check if it's a PPT file with the right pattern
                                if (('Disposition_summary' in item_name or 'Recommendation_Summary' in item_name) and 
                                    (item_name.lower().endswith('.ppt') or item_name.lower().endswith('.pptx'))):
                                    found_files.append((item_name, directory_path))
                                    print(f"{indent}Found disposition file: {item_name}")
                            elif os.path.isdir(item_path):
                                print(f"{indent}Searching subdirectory: {item_name}")
                                search_recursive(item_path, depth + 1)
                    except PermissionError:
                        print(f"{indent}Permission denied: {directory_path}")
                    except Exception as e:
                        print(f"{indent}Error searching {directory_path}: {e}")
                
                # Start recursive search in the QN folder
                search_recursive(qn_folder_path)
                
                if found_files:
                    # Extract just the filenames for version comparison
                    file_names = [file_info[0] for file_info in found_files]
                    
                    # Get the latest version file
                    latest_file = get_latest_version_file(file_names)
                    
                    if latest_file:
                        # Find the full path for the latest file
                        latest_file_path = None
                        for file_name, file_dir in found_files:
                            if file_name == latest_file:
                                latest_file_path = os.path.join(file_dir, latest_file)
                                break
                        
                        if latest_file_path:
                            # Initialize the QN entry if it doesn't exist
                            if qn_number not in disposition_files:
                                disposition_files[qn_number] = []
                            
                            disposition_files[qn_number].append({
                                "filename": latest_file,
                                "filepath": latest_file_path,
                                "source": main_subfolder
                            })
                            print(f"    Added {latest_file} from {main_subfolder} for QN {qn_number}")
                else:
                    print(f"    No disposition summary files found in {qn_folder_path}")
                    
    except Exception as e:
        print(f"Error finding disposition files: {str(e)}")
        
    return disposition_files

def create_business_context_text(qn_data: dict) -> str:
    """
    Create business context text from QN data mapping Excel columns to meaningful descriptions.
    
    Maps database columns to comprehensive business context describing:
    - Vendor information and component manufacturing process
    - Part numbers, engineering drawings, and zone locations
    - MQI identifications and defect reporting through SAP
    - Non-conformance details and corrective actions
    - Review process and disposition status
    
    Args:
        qn_data (dict): QN record from database
        
    Returns:
        str: Business context formatted text for embedding generation
    """
    try:
        # Read the introduction text file for business context
        intro_text = ""
        try:
            intro_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'constants', 'chat_intro.txt')
            with open(intro_file_path, 'r', encoding='utf-8') as f:
                intro_text = f.read().strip()
        except Exception as e:
            print(f"Warning: Could not read chat_intro.txt: {e}")
            intro_text = ""
        
        # Create comprehensive business context narrative
        historical_business_text = (
            "It reads the non-confermence document which is a diviation from the normal define drawings and specifications. "
        )
        
        # Combine intro text with historical business text
        provide_intro = False
        if intro_text and provide_intro:
            business_text = f"{intro_text}\n\nHistorical QN Context:\n{historical_business_text}"
        else:
            business_text = historical_business_text
        
        return business_text.strip()
        
    except Exception as e:
        print(f"Error creating business context text for QN {qn_data.get('QN', 'Unknown')}: {e}")
        # Fallback to simple concatenation
        return f"QN {qn_data.get('QN', 'Unknown')}: {str(qn_data)}"

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
                print(f"    Found version {version_num} in file: {file_name}")
                version_found = True
                break
        
        if not version_found:
            base_files.append(file_name)
            print(f"    No version found in file: {file_name}")
    
    # Return the file with the highest version number
    if versioned_files:
        latest_versioned = max(versioned_files, key=lambda x: x[1])
        print(f"    Selected latest version: {latest_versioned[0]} (V{latest_versioned[1]})")
        return latest_versioned[0]
    
    # If no versioned files, return the first base file
    if base_files:
        print(f"    No versioned files found, selecting: {base_files[0]}")
        return base_files[0]
    
    return None

def extract_disposition_files(source_files: dict, destination_path: str) -> list:
    """
    Extract/copy files from their source locations to a destination folder.
    
    Args:
        source_files (Dict[str, dict]): Dictionary mapping QN numbers to file info (filename and filepath)
        destination_path (str): Path where files should be copied
        
    Returns:
        list: List of extracted file information
    """
    import shutil
    extracted_files = []
    
    # Create destination directory if it doesn't exist
    os.makedirs(destination_path, exist_ok=True)
    
    for qn_number, file_info in source_files.items():
        try:
            source_file_path = file_info["filepath"]
            original_filename = file_info["filename"]
            
            if os.path.exists(source_file_path):
                destination_file_path = os.path.join(destination_path, original_filename)
                
                # Copy the file
                shutil.copy2(source_file_path, destination_file_path)
                
                extracted_files.append({
                    "qn_number": qn_number,
                    "original_path": source_file_path,
                    "extracted_path": destination_file_path,
                    "filename": original_filename
                })
                
                print(f"✓ Extracted QN{qn_number}: {original_filename}")
                # print(f"  Source: {source_file_path}")
                # print(f"  Destination: {destination_file_path}")
            else:
                print(f"✗ File not found for QN{qn_number}: {source_file_path}")
                
        except Exception as e:
            print(f"✗ Error extracting QN{qn_number}: {str(e)}")
            
    return extracted_files

@search_qn_api.route('/search_qn', methods=['POST'])
def search_qn():
    """
    Search for QNs based on MQI and Part Number in the qn_db.qn_historical collection.
    Static functionality - embedding generation has been disabled.
   
    Expected JSON body:
    {
        "MQI": "MQI_value",
        "Part_Number": "part_number_value",
        "current_QN": "current_QN_value"  # Optional: QN to include in results
    }
   
    Returns filtered results without generating embeddings (static mode).
    """
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400
       
        # Extract MQI, Part Number, and current QN from request
        mqi = data.get('MQI')
        part_number = data.get('Part Number')
        current_qn = data.get('QN')  # Optional field
       
        # Validate required fields
        if mqi is None or part_number is None:
            return jsonify({
                "error": "Both 'MQI' and 'Part_Number' are required in the request body"
            }), 400
       
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        collection = db[QN_HISTORICAL_COLLECTION]
       
        # Build search criteria
        search_criteria = {}
       
        # Handle MQI field (try to convert to appropriate type)
        try:
            if isinstance(mqi, str) and mqi.replace('.', '').replace('-', '').isdigit():
                mqi = float(mqi)
            search_criteria["MQI"] = mqi
        except (ValueError, TypeError):
            search_criteria["MQI"] = mqi
       
        # Handle Part Number (try both as string and integer)
        try:
            if isinstance(part_number, str) and part_number.isdigit():
                # Try searching as both string and integer
                search_criteria = {
                    "$and": [
                        {"MQI": mqi},
                        {"$or": [
                            {"Part Number": part_number},
                            {"Part Number": int(part_number)},
                            {"Part_Number": part_number},
                            {"Part_Number": int(part_number)}
                        ]}
                    ]
                }
            else:
                search_criteria = {
                    "$and": [
                        {"MQI": mqi},
                        {"$or": [
                            {"Part Number": part_number},
                            {"Part_Number": part_number}
                        ]}
                    ]
                }
        except (ValueError, TypeError):
            search_criteria = {
                "$and": [
                    {"MQI": mqi},
                    {"$or": [
                        {"Part Number": part_number},
                        {"Part_Number": part_number}
                    ]}
                ]
            }
       
        # print(f"Search criteria: {search_criteria}")
       
        # Execute search
        results = list(collection.find(search_criteria))
        # print("-"*25,"\n", "find results:", len(results))
       
        # Convert ObjectId to string for JSON serialization
        for result in results:
            if '_id' in result:
                result['_id'] = str(result['_id'])

        # Extract defect keywords for pattern matching
        def extract_defect_keywords_and_values(text):
            """Extract measurement keywords and their associated values from text"""
            import re
            if not text:
                return {}
            
            # Comprehensive keyword patterns with all variations
            keywords_patterns = {
                'over_max': r'(over max|o/max|O/MAX|over the limit|up to omax|up to o/max|overmax)',
                'under_min': r'(u/min|U/MIN|under the limit|under min|up to umin|upto u/min|undermin)',
                'beyond': r'(beyond the|beyond)',
                'profile_related': r'(above the|below the|\+ve matl|-ve matl|OOT|out of tolerance)',
            }
            
            extracted = {}
            for keyword_type, pattern in keywords_patterns.items():
                # Find keyword matches
                keyword_matches = re.finditer(pattern, text, re.IGNORECASE)
                keyword_values = []
                
                for match in keyword_matches:
                    keyword_text = match.group()
                    start_pos = match.start()
                    end_pos = match.end()
                    
                    # Look for numeric values before and after the keyword
                    # Search in a larger window around the keyword (100 characters before and after)
                    search_window_start = max(0, start_pos - 100)
                    search_window_end = min(len(text), end_pos + 100)
                    context = text[search_window_start:search_window_end]
                    
                    # Enhanced numeric pattern to capture decimals, scientific notation, and measurements
                    numeric_pattern = r'(\d+\.?\d*(?:[eE][+-]?\d+)?)'
                    
                    # Find all numeric values in the context
                    numeric_matches = re.finditer(numeric_pattern, context)
                    values = []
                    
                    for num_match in numeric_matches:
                        try:
                            num_value = float(num_match.group())
                            # Get position relative to keyword in context
                            num_pos_in_context = num_match.start()
                            keyword_pos_in_context = start_pos - search_window_start
                            
                            # Determine if value is before or after keyword
                            position = "after" if num_pos_in_context > keyword_pos_in_context else "before"
                            
                            values.append({
                                'value': num_value,
                                'position': position,
                                'text': num_match.group()
                            })
                        except ValueError:
                            continue
                    
                    if values:
                        keyword_values.append({
                            'keyword': keyword_text,
                            'values': values,
                            'context': context.strip()
                        })
                
                if keyword_values:
                    extracted[keyword_type] = keyword_values
            
            return extracted

        # Perform criteria-based comparison
        text_comparison = None
        current_qn_data = None
        currentQNFiles = []
        similarity_scores = {}
        
        if current_qn and results:
            try:
                # Get current QN data to extract its data for comparison
                input_collection = db[QN_INPUT_COLLECTION]
                current_qn_data = input_collection.find_one({"QN": int(current_qn)})
               
                if current_qn_data:
                    # Add current QN document info if qn_source exists
                    qn_source = current_qn_data.get('qn_source')
                    if qn_source:
                        filename = os.path.basename(qn_source)
                        currentQNFiles.append({
                            "filename": filename,
                            "filepath": qn_source,
                            "filetype": "input"
                        })
                    # Extract current QN data for comparison
                    current_damage_code = current_qn_data.get('Defect Code', '')
                    current_short_text = current_qn_data.get('Short Text', '')
                    current_long_text = current_qn_data.get('Long Text', '')
                    
                    # Extract keywords and values from current QN's long text
                    current_keywords = extract_defect_keywords_and_values(current_long_text)
                    
                    print(f"Performing criteria-based comparison for {len(results)} historical QNs...")
                    
                    # Process each historical QN for scoring
                    for result in results:
                        qn_number = str(result.get('QN', ''))
                        
                        # Start with base score of 55%
                        score = 55
                        
                        # 1. Damage Code matching (+15%)
                        historical_damage_code = result.get('Defect Code', '')
                        print(current_damage_code , historical_damage_code)
                        if current_damage_code and historical_damage_code:
                            if str(current_damage_code).strip().lower() == str(historical_damage_code).strip().lower():
                                score += 15
                                print(f"  QN {qn_number}: +15% for Defect Code match")
                        
                        # 2. Short Text matching (+20%)
                        historical_short_text = result.get('Short Text', '')
                        if current_short_text and historical_short_text:
                            if str(current_short_text).strip().lower() == str(historical_short_text).strip().lower():
                                score += 20
                                print(f"  QN {qn_number}: +20% for Short Text match")
                        
                        # Store final score
                        similarity_scores[qn_number] = min(score, 100)  # Cap at 100%
                    
                    text_comparison = {
                        "current_qn": current_qn,
                        "total_historical_count": len(results),
                        "processed_historical_count": len(similarity_scores),
                        "similarity_json": similarity_scores,
                        "comparison_performed": True,
                        "scoring_method": "criteria_based"
                    }
                    
                    print(f"Criteria-based comparison completed for {len(similarity_scores)} QNs")
                    
                else:
                    text_comparison = {
                        "message": "Current QN data not found",
                        "comparison_performed": False
                    }
            except Exception as e:
                print(f"Error in criteria-based comparison: {e}")
                text_comparison = {
                    "error": f"Criteria-based comparison failed: {str(e)}",
                    "comparison_performed": False
                }
       
        # Save business context to text file for qnquery to use
        if current_qn and current_qn_data:
            try:
                # Create business context for current QN
                current_business_context = create_business_context_text(current_qn_data)
                
                # Create comprehensive context with historical QNs
                historical_context = ""
                for result in results:
                    historical_business_context = create_business_context_text(result)
                    qn_number = result.get('QN', 'Unknown')
                    historical_context += f"\n--- Historical QN {qn_number} ---\n"
                    historical_context += historical_business_context + "\n"
                    # Add relevant fields for context
                    historical_context += f"QN: {result.get('QN', '')}\n"
                    historical_context += f"Part Number: {result.get('Part Number', '')}\n"
                    historical_context += f"MQI: {result.get('MQI', '')}\n"
                    historical_context += f"Long Text: {result.get('Long Text', '')}\n"
                    historical_context += f"Short Text: {result.get('Short Text', '')}\n"
                    historical_context += f"Defect Code: {result.get('Defect Code', '')}\n"
                    historical_context += f"Drawing Revision: {result.get('Drawing Revision', '')}\n"
                    if 'Percentage_Closeness' in result:
                        historical_context += f"Similarity Score: {result.get('Percentage_Closeness', 0)}%\n"
                    historical_context += "\n"
                
                # Combine current QN context with historical context
                full_context = f"=== CURRENT QN {current_qn} CONTEXT ===\n"
                full_context += current_business_context + "\n"
                full_context += f"QN: {current_qn_data.get('QN', '')}\n"
                full_context += f"Part Number: {current_qn_data.get('Part Number', '')}\n"
                full_context += f"MQI: {current_qn_data.get('MQI', '')}\n"
                full_context += f"Long Text: {current_qn_data.get('Long Text', '')}\n"
                full_context += f"Short Text: {current_qn_data.get('Short Text', '')}\n"
                full_context += f"Defect Code: {current_qn_data.get('Defect Code', '')}\n"
                full_context += f"Drawing Revision: {current_qn_data.get('Drawing Revision', '')}\n"
                full_context += f"Status: {current_qn_data.get('status', '')}\n\n"
                
                full_context += f"=== HISTORICAL QN CONTEXT ({len(results)} QNs) ===\n"
                full_context += historical_context
                
                # Create context directory if it doesn't exist
                project_dir = os.path.dirname(os.path.dirname(__file__))
                context_dir = os.path.join(project_dir, "context_files")
                os.makedirs(context_dir, exist_ok=True)
                
                # Save context to text file with QN-specific filename
                context_file_path = os.path.join(context_dir, f"qn_{current_qn}_context.txt")
                with open(context_file_path, 'w', encoding='utf-8') as f:
                    f.write(full_context)
                
                print(f"Business context saved to: {context_file_path}")
                print(f"Context file contains {len(results)} historical QNs with business context")
                
            except Exception as e:
                print(f"Error saving business context to file: {e}")
        
        print(f"Static mode: Processing {len(results)} historical QNs without embedding generation")
        print("Business context saved to text files for direct access by qnquery")
       
        # Find disposition summary PowerPoint files for historical QNs to map to records
        disposition_files_mapping = {}
        try:
            # Get QN numbers from the results
            qn_numbers = []
            for result in results:
                if result.get('QN'):
                    qn_number = str(result.get('QN'))
                    qn_numbers.append(qn_number)
            
            if qn_numbers:
                print(f"Searching for disposition summary files for {len(qn_numbers)} QNs...")
                
                # Search path for disposition summary files
                search_path = SEARCH_PATH
                
                # Find disposition summary files
                found_files = find_disposition_summary_files(search_path, qn_numbers)
                print(found_files)
                
                # Create disposition_files_mapping
                if found_files:
                    total_files_count = sum(len(files) for files in found_files.values())
                    print(f"Found {total_files_count} disposition summary files from {len(found_files)} QNs")
                    
                    # Store mapping of QN to separate design and structure objects
                    for qn_number, file_list in found_files.items():
                        qn_disposition = {}
                        
                        for file_info in file_list:
                            original_filename = file_info["filename"]
                            original_filepath = file_info["filepath"]
                            source_folder = file_info["source"]
                            
                            file_object = {
                                "filename": original_filename,
                                "filepath": original_filepath,
                                "filetype": "ppt" if original_filename.endswith(".ppt") else "pptx",
                                "source": source_folder
                            }
                            
                            # Map based on source folder
                            if source_folder == "Design":
                                qn_disposition["design"] = file_object
                            elif source_folder == "Disk_STR":
                                qn_disposition["structure"] = file_object
                        
                        # Only add to mapping if we have at least one file
                        if qn_disposition:
                            disposition_files_mapping[qn_number] = qn_disposition
                    
                    print(f"Created mapping for {len(disposition_files_mapping)} QNs with design/structure disposition files")
                else:
                    print("No disposition summary files found")
            
        except Exception as e:
            print(f"Error processing disposition summary files: {e}")

        # Prepare response with all historical QNs and their full data
        if text_comparison and text_comparison.get("comparison_performed"):
            # Get similarity JSON mapping from criteria-based scoring
            similarity_json = text_comparison.get("similarity_json", {})
            
            # Include all results with criteria-based analysis data
            enhanced_results = []
            for result in results:
                qn = result.get('QN')
                # Add the complete historical data plus similarity percentage if available
                enhanced_result = result.copy()  # Get all original columns
                
                # Add similarity percentage from criteria-based scoring if available
                qn_str = str(qn)
                if qn_str in similarity_json:
                    enhanced_result["Percentage_Closeness"] = similarity_json[qn_str]
                else:
                    # Default base score if not processed
                    enhanced_result["Percentage_Closeness"] = 55
                
                # Add disposition file info directly to the QN record if available
                if qn_str in disposition_files_mapping:
                    disposition_info = disposition_files_mapping[qn_str]
                    if "design" in disposition_info:
                        enhanced_result["design"] = disposition_info["design"]
                    if "structure" in disposition_info:
                        enhanced_result["structure"] = disposition_info["structure"]
                
                enhanced_results.append(enhanced_result)
            
            # Sort enhanced_results by Percentage_Closeness in descending order (if available)
            enhanced_results.sort(key=lambda x: x.get("Percentage_Closeness", 0), reverse=True)
            print("all results with criteria-based analysis ---------------->", len(enhanced_results))
            response = { "historicalQn": enhanced_results } # Return all historical QNs with analysis
        else:
            # Fallback if no LLM comparison was performed - return all results with disposition files
            enhanced_results = []
            for result in results:
                enhanced_result = result.copy()
                
                # Add disposition file info directly to the QN record if available
                qn_str = str(result.get('QN'))
                if qn_str in disposition_files_mapping:
                    disposition_info = disposition_files_mapping[qn_str]
                    if "design" in disposition_info:
                        enhanced_result["design"] = disposition_info["design"]
                    if "structure" in disposition_info:
                        enhanced_result["structure"] = disposition_info["structure"]
                
                enhanced_results.append(enhanced_result)
            
            response = { "historicalQn": enhanced_results }  # Return all matched results

        # Fetch documents from qn_documents table based on part_number
        documents_qn = []
        try:
            documents_collection = db[QN_DOCUMENTS_COLLECTION]
            document_results = list(documents_collection.find({"partnumber": part_number}))
            
            for doc in document_results:
                # Extract file information from the new document structure
                if "filename" in doc and "filepath" in doc:
                    documents_qn.append({
                        "filename": doc["filename"],
                        "filepath": doc["filepath"],
                        "filetype": doc.get("filetype", "")  # Optional field
                    })
            
            print(f"Found {len(documents_qn)} documents for part number: {part_number}")
            
        except Exception as e:
            print(f"Error fetching documents: {e}")
            documents_qn = []
        
        # Add documentsQn to response
        response["historyQNFiles"] = documents_qn
        
        # Add current QN document to response if available
        if currentQNFiles:
            response["currentQNFiles"] = currentQNFiles

        # Update status and analyse_date in qn_input table if current_qn is provided
        if current_qn:
            try:
                input_collection = db[QN_INPUT_COLLECTION]
                current_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                # Only update status to "analyse" if current status is "open" or empty
                # This prevents overriding "accept" or "reject" statuses
                update_result = input_collection.update_one(
                    {
                        "QN": int(current_qn),
                        "$or": [
                            {"status": "Open"},
                            {"status": {"$in": ["", None]}},
                            {"status": {"$exists": False}}
                        ]
                    },
                    {
                        "$set": {
                            "status": "analyse",
                            "analyse_date": current_date
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    print(f"Updated QN {current_qn} status to 'analyse' with date: {current_date}")
                elif update_result.matched_count == 0:
                    # Check what the current status actually is
                    existing_record = input_collection.find_one({"QN": int(current_qn)})
                    if existing_record:
                        current_status = existing_record.get('status', 'Not set')
                        print(f"QN {current_qn} status not updated - current status is '{current_status}' (only updates when status is 'open')")
                    else:
                        print(f"QN {current_qn} not found in database")
                else:
                    print(f"QN {current_qn} found but status not modified (may already be 'analyse')")
                    
            except Exception as e:
                print(f"Error updating QN status: {e}")

        print(f"Found {len(results)} total matching historical QN records")
        if 'enhanced_results' in locals():
            print(f"Processed {len(enhanced_results)} QNs with criteria-based analysis")
        print(f"Static mode: Processed {len(results)} historical QNs without embedding generation")
        
        # Count total disposition files across all QNs
        total_disposition_files = 0
        for qn_disposition in disposition_files_mapping.values():
            if isinstance(qn_disposition, dict):
                total_disposition_files += len(qn_disposition)  # Count design and structure objects
        print(f"Added {total_disposition_files} disposition summary PowerPoint files from {len(disposition_files_mapping)} QNs")
        return jsonify(response), 200
       
    except Exception as e:
        current_app.logger.error(f"Error in search_qn: {str(e)}")
        return jsonify({
            "error": f"An error occurred while searching: {str(e)}",
            "search_criteria": {
                "MQI": data.get('MQI') if 'data' in locals() else None,
                "Part_Number": data.get('Part_Number') if 'data' in locals() else None,
                "current_QN": data.get('current_QN') if 'data' in locals() else None
            }
        }), 500
