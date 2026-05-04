# Status and workflow related constants

# QN Status Values
STATUS_OPEN = "Open"
STATUS_ANALYSE = "analyse"
STATUS_ACCEPT = "accept"
STATUS_REJECT = "reject"

# Status Lists
VALID_STATUSES = [STATUS_OPEN, STATUS_ANALYSE, STATUS_ACCEPT, STATUS_REJECT]
FINAL_STATUSES = [STATUS_ACCEPT, STATUS_REJECT]  # Statuses that should not be overridden
INITIAL_STATUSES = [STATUS_OPEN, "", None]  # Statuses that can be updated to analyse

# Field Names
STATUS_FIELD = "status"
RECOMMENDATION_FIELD = "recommendation" 
LAST_UPDATED_FIELD = "last_updated"
UPDATED_BY_FIELD = "updated_by"
ACCEPT_DATE_FIELD = "accept_date"
REJECT_DATE_FIELD = "reject_date"
ANALYSE_DATE_FIELD = "analyse_date"

# API Identifiers
QNFILEPATH_API_ID = "qnfilepath_api"
SEARCH_QN_API_ID = "search_qn_api"
ANALYSE_API_ID = "analyse_api"

# Date Format
DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S'