# Common imports and configurations used across all API endpoints
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import re
import pandas as pd
import glob
import uuid
import fitz
import requests
from datetime import datetime
import json
from bson import json_util
import numpy as np
# SSL Certificate handling for HuggingFace downloads
import ssl
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from langchain_community.llms import AzureOpenAI, OpenAI 
from langchain_core.prompts import PromptTemplate
from langchain_community.chat_models import AzureChatOpenAI
from langchain.text_splitter import CharacterTextSplitter, RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.memory import ConversationBufferMemory
from langchain.chains import RetrievalQA, ConversationalRetrievalChain
from langchain_community.document_loaders import CSVLoader, JSONLoader, OnlinePDFLoader, PyMuPDFLoader, UnstructuredAPIFileLoader, PyPDFLoader, BSHTMLLoader
from langchain_community.vectorstores import DocArrayInMemorySearch, FAISS
from langchain.indexes import VectorstoreIndexCreator
from langchain.chains.question_answering import load_qa_chain
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OpenAIEmbeddings, AzureOpenAIEmbeddings
from pymongo import MongoClient
from pydantic import BaseModel
from pptx import Presentation
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pdf2image import convert_from_path
from PIL import Image
from pptx.util import Inches, Pt
from datetime import datetime, timezone
from pdf2image import convert_from_bytes
from PIL import Image
from datetime import datetime, timedelta
from langchain_ollama import OllamaLLM
from constants.database_constants import MONGO_URI, DATABASE_NAME, QN_HISTORICAL_COLLECTION

# SSL Certificate handling for HuggingFace downloads
import ssl
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Disable SSL warnings and certificate verification for HuggingFace downloads
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
ssl._create_default_https_context = ssl._create_unverified_context

# Global configurations
llm = OllamaLLM(
    model="llama3.2:1b",
    base_url="http://localhost:11434"
)

memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True, input_key="question")
global l

# MongoDB configurations
client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
collection = db[QN_HISTORICAL_COLLECTION]
current_timestamp = datetime.now()

model_name = "tomaarsen/static-retrieval-mrl-en-v1"
model_kwargs = {'device': 'cpu'}
encode_kwargs = {'normalize_embeddings': False}

# Initialize embeddings with SSL workaround
try:
    # Import our SSL configuration helper
    from ssl_config import setup_embeddings_with_ssl_fix
    
    # Use the SSL-aware embeddings setup
    embeddings = setup_embeddings_with_ssl_fix()
    print("✓ Embeddings initialized successfully with SSL configuration")
    
except Exception as e:
    print(f"⚠️ Failed to initialize embeddings with SSL config: {e}")

# Regular expression pattern
pattern = re.compile(r'IS ACT\.\s*([+-]?(\d+\.\d+|\.\d+))')

def extract_input_value(text):
    match = pattern.search(text)
    return match.group(1) if match else None

# Column mapping and schema utils
COLUMN_MAPPING = {
    "Part No": ["Part No", "Part Number", "PartNo", "Part_No", "PartNumber", "part_no", "part_number", "PART_NO", "PART_NUMBER", "part no", "part number", "Material"],
    "Rev": ["Rev", "Revision", "Drawing Revision", "rev", "revision", "REV", "REVISION", "drawing revision", "Engineering Chng Num"],
    "QN": ["QN", "Quality Number", "Quality_Number", "qn", "QualityNumber", "QUALITY_NUMBER", "quality number", "quality_number", "Q.N.", "Q.N", "Qn", "Notification"],
    "SN": ["SN", "Serial Number", "Serial_Number", "SerialNumber", "sn", "serial_number", "SERIAL_NUMBER", "serial number", "S.N.", "S.N", "Sn", "Item Serial Number"],
    "Vendor Code": ["Vendor Code", "Vendor_Code", "VendorCode", "vendor_code", "VENDOR_CODE", "vendor code"],
    "Vendor Name": ["Vendor Name", "Vendor_Name", "VendorName", "vendor_name", "VENDOR_NAME", "vendor name", "List name (Vendor Name)", "Vendor", "vendor", "List name", "List Name"],
    "Issue date": ["Issue date", "Issue_date", "IssueDate", "issue_date", "ISSUE_DATE", "Date Issued", "DateIssued", "issue date", "date issued", "Created On"],
    "Received date": ["Received date", "Received_date", "ReceivedDate", "received_date", "RECEIVED_DATE", "Date Received", "DateReceived", "received date", "date received"],
    "Item": ["Item", "item", "ITEM", "Item Number", "ItemNumber", "Item_Number", "item number", "item_number", "Item number"],
    "Defect Code": ["Defect Code", "Defect_Code", "DefectCode", "defect_code", "DEFECT_CODE", "Defect", "defect", "defect code", "Damage Code"],
    "Zone Location": ["Zone Location", "Zone_Location", "ZoneLocation", "zone_location", "ZONE_LOCATION", "Zone", "zone", "zone location"],
    "Non Conformance": ["Non Conformance", "Non_Conformance", "NonConformance", "non_conformance", "NON_CONFORMANCE", "NC Type", "NCType", "non conformance", "nc type"],
    "Short Text": ["Short Text", "Short_Text", "ShortText", "short_text", "SHORT_TEXT", "Description", "description", "short text", "Item text(Short Text)"],
    "Long Text": ["Long Text", "Long_Text", "LongText", "long_text", "LONG_TEXT", "Detailed Description", "DetailedDescription", "long text", "detailed description", "Defect long text"],
    "MQI": ["MQI", "mqi", "Measurement Quality Index", "MeasurementQualityIndex", "measurement quality index", "MQI Number"],
    "actual": ["actual", "Actual", "ACTUAL", "Actual Value", "ActualValue", "Measured", "measured", "actual value"],
}

def find_matching_column(df_columns, target_field):
    """
    Find a matching column in the dataframe for the target field
    Returns the actual column name from df if found, None otherwise
    """
    possible_names = COLUMN_MAPPING.get(target_field, [])
    # First try exact match
    for col in df_columns:
        if pd.isna(col) or col is None:
            continue
        col_str = str(col).strip()
        if col_str in possible_names:
            return col
    # Try case-insensitive match
    for col in df_columns:
        if pd.isna(col) or col is None:
            continue
        try:
            col_str = str(col).strip().lower()
            for name in possible_names:
                if col_str == name.lower():
                    return col
        except (AttributeError, TypeError):
            continue
    return None

def map_dataframe_to_schema(df):
    """
    Map dataframe columns to the required schema
    Returns a new dataframe with standardized column names
    """
    mapped_df = pd.DataFrame()
    current_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    # Define the required schema with default values - ensuring all required columns are present
    schema_fields = {
        "Item": None,                    # Item number
        "QN": None,                      # Notification  
        "SN": "",                        # Item Serial Number
        "Short Text": "",                # Item text(Short Text)
        "Defect Code": "",              # Damage Code
        "Issue date": "",               # Created On
        "Part No": None,                # Material
        "MQI": None,                    # MQI Number
        "Vendor Code": "",              # Vendor Code
        "Vendor Name": "",              # List name (Vendor Name)
        "Rev": "",                      # Engineering Chng Num
        "Zone Location": "",            # Zone Location
        "Long Text": "",                # Defect long text
        "Received date": "",
        "Non Conformance": "Dimensional",
        "actual": None,
        "status": "Open",
        "created_date": current_date
    }
    # Custom mapping from Excel columns to schema fields - exact column name matches
    custom_excel_mapping = {
        "Item": "Item number",                          # Item number
        "QN": "Notification",                           # Notification  
        "SN": "Item Serial Number",                     # Item Serial Number
        "Short Text": "Item text(Short Text)",         # Item text(Short Text)
        "Defect Code": "Damage Code",                   # Damage Code
        "Issue date": "Created On",                     # Created On
        "Part No": "Material",                          # Material
        "MQI": "MQI Number",                           # MQI Number
        "Vendor Code": "Vendor Code",                   # Vendor Code
        "Vendor Name": "List name (Vendor Name)",       # List name (Vendor Name)
        "Rev": "Engineering Chng Num",                 # Engineering Chng Num
        "Zone Location": "Zone Location",               # Zone Location
        "Long Text": "Defect long text",               # Defect long text
        "Received date": "Created On"
    }
    for schema_field in schema_fields.keys():
        if schema_field in ["status", "created_date", "Received date"]:
            mapped_df[schema_field] = [schema_fields[schema_field]] * len(df)
        else:
            match_col = find_matching_column(df.columns, schema_field)
            if match_col:
                mapped_df[schema_field] = df[match_col]
                print(f"✓ Mapped '{match_col}' → '{schema_field}'")
            elif schema_field in custom_excel_mapping:
                custom_col = custom_excel_mapping[schema_field]
                if custom_col in df.columns:
                    mapped_df[schema_field] = df[custom_col]
                    print(f"✓ Custom mapped '{custom_col}' → '{schema_field}'")
                else:
                    mapped_df[schema_field] = [schema_fields[schema_field]] * len(df)
                    print(f"⚠️ Column '{custom_col}' not found for '{schema_field}', using default")
            else:
                mapped_df[schema_field] = [schema_fields[schema_field]] * len(df)
                print(f"⚠️ No mapping found for '{schema_field}', using default")
    # Handle date formatting
    for date_field in ["Issue date", "Received date"]:
        if date_field in mapped_df.columns and not mapped_df[date_field].equals(pd.Series([current_date] * len(mapped_df))):
            mapped_df[date_field] = mapped_df[date_field].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S') if not pd.isnull(x) and hasattr(x, 'strftime') else x)
    # If actual value wasn't found but Long Text exists, try to extract it
    if mapped_df["actual"].isna().all():
        long_text_col = find_matching_column(df.columns, "Long Text")
        if long_text_col:
            mapped_df["actual"] = df[long_text_col].apply(extract_input_value)
    return mapped_df

def safe_int_convert(value):
    """Safely convert value to integer"""
    if value is None or value == '' or pd.isna(value):
        return None
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return None

def safe_float_convert(value):
    """Safely convert value to float"""
    if value is None or value == '' or pd.isna(value):
        return None
    try:
        return float(str(value))
    except (ValueError, TypeError):
        return None

def safe_str_convert(value):
    """Safely convert value to string"""
    if value is None or pd.isna(value):
        return ""
    return str(value)

def upload_to_cosmosdb(data):
    # This function is currently disabled - using MongoDB instead
    print("upload_to_cosmosdb called but disabled - using MongoDB")
    pass
    # for item in data:
    #     # Add a unique identifier to each item
    #     item['id'] = str(uuid.uuid4())
    #     item['status'] = 'Open'
    #     item['recommendation']=""
    #     try:
    #         container.upsert_item(item)
    #         # print(f"Item upserted successfully: {item}")
    #     except Exception as e:
    #         print(f"Error upserting item: {item}. Error: {str(e)}")