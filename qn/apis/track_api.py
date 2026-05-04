# Contains /track endpoint
from flask import Blueprint, request, jsonify
import pandas as pd
from pymongo import MongoClient

track_api = Blueprint('track_api', __name__)

@track_api.route('/track', methods=['POST'])
def qntrack():
    print("track")
    data=request.get_json()
    print(data)
    qntrack =  data["qn"]
    print(f"Looking for QN: {qntrack} (type: {type(qntrack)})")
    
    mongo_uri = "mongodb://localhost:27017/"
    database_name="qn_pwa"
    collection_name = "qn_input"
    client = MongoClient(mongo_uri)
    db = client[database_name]
    collection1 = db[collection_name]
    
    # Debug: Check what QN values exist in the collection
    all_qns = list(collection1.find({}, {"QN": 1, "_id": 0}))
    print(f"Available QNs in database: {[item.get('QN') for item in all_qns[:10]]}")  # Show first 10
    
    # Try different query approaches
    items = []
    
    # First try: exact integer match
    try:
        items = list(collection1.find({"QN": int(qntrack)}))
        print(f"Found {len(items)} items with integer QN: {int(qntrack)}")
    except ValueError:
        print(f"Cannot convert {qntrack} to integer")
    
    # If no results, try string match
    if not items:
        items = list(collection1.find({"QN": str(qntrack)}))
        print(f"Found {len(items)} items with string QN: {str(qntrack)}")
    
    # If still no results, try case-insensitive or partial match
    if not items:
        items = list(collection1.find({"QN": {"$regex": f"^{qntrack}$", "$options": "i"}}))
        print(f"Found {len(items)} items with regex QN: {qntrack}")
    
    # Convert ObjectId to string and handle missing fields
    for i in items:
        i["_id"]=str(i["_id"])
        # Ensure all required fields exist with default values
        if "accept_date" not in i or i["accept_date"] is None or i["accept_date"] == "":
            i["accept_date"] = ""
        if "reject_date" not in i or i["reject_date"] is None or i["reject_date"] == "":
            i["reject_date"] = ""
        if "analyse_date" not in i or i["analyse_date"] is None or i["analyse_date"] == "":
            i["analyse_date"] = ""
        if "created_date" not in i or i["created_date"] is None or i["created_date"] == "":
            i["created_date"] = ""
        if "status" not in i or i["status"] is None or i["status"] == "":
            i["status"] = ""
    
    # Check if any items were found
    if not items:
        return jsonify({"error": "No data found for the given QN"}), 404
    
    # Create DataFrame
    df_input = pd.DataFrame(items)
    print("DataFrame columns:", df_input.columns.tolist())
    print("DataFrame shape:", df_input.shape)
    
    # Check if required columns exist before selecting
    required_columns = ["status", "created_date", "analyse_date", "accept_date", "reject_date"]
    existing_columns = [col for col in required_columns if col in df_input.columns]
    
    if not existing_columns:
        return jsonify({"error": "Required columns not found in data"}), 500
    
    # Select only the existing columns and handle empty/null values
    df_selected = df_input[existing_columns].copy()
    
    # Fill any remaining NaN or None values with empty strings
    df_selected = df_selected.fillna("")
    
    # Convert any None values to empty strings
    for col in df_selected.columns:
        df_selected[col] = df_selected[col].apply(lambda x: "" if x is None else x)

    # Convert the DataFrame to a list of dictionaries and return as JSON
    return jsonify(df_selected.to_dict(orient='records')), 200
