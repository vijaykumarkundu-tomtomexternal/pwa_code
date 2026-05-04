# General application constants

# Application Configuration
APP_NAME = "QN Analysis Tool"
VERSION = "1.0.0"

# Text Processing
CHUNK_SIZE = 1024
CHUNK_OVERLAP = 200

# Similarity Thresholds
MIN_PERCENTAGE_CLOSENESS = 80
DEFAULT_SIMILARITY_SCORE = 70
DIRECTION_MATCH_BONUS = 15
EXACT_VALUE_MATCH_BONUS = 15
WORST_CASE_VALUE_BONUS = 10

# LLM Configuration
MAX_HISTORICAL_QNS_FOR_COMPARISON = 100

# Pagination
DEFAULT_PAGE_SIZE = 10
MAX_RESULTS_LIMIT = 100

# Error Messages
MISSING_JSON_ERROR = "No JSON data provided"
MISSING_FIELDS_ERROR = "Missing required fields"
QN_NOT_FOUND_ERROR = "QN not found"
INTERNAL_SERVER_ERROR = "Internal server error"

# Success Messages
STATUS_UPDATED_SUCCESS = "status updated successfully"
EMBEDDINGS_GENERATED_SUCCESS = "Embeddings successfully saved"

# Regular Expressions
QN_FOLDER_PATTERN = r'QN(\d+)'
QN_NUMBER_PATTERN = r'\b\d{10}\b|\b\d{8,12}\b'
NUMERIC_PATTERN = r'^\d+$'
DECIMAL_PATTERN = r'^\d+\.\d+$'