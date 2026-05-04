# Contains /mqi_counts_by_part endpoint
from flask import Blueprint, request, jsonify
from datetime import datetime
from pymongo import MongoClient
from constants.database_constants import MONGO_URI, DATABASE_NAME, QN_PARETO_COLLECTION

mqi_counts_by_part_api = Blueprint('mqi_counts_by_part_api', __name__)

@mqi_counts_by_part_api.route('/mqi_counts_by_part', methods=['POST'])
def mqi_counts_by_part():
    """
    Returns a list of {"Part Number": <int>, "MQI": <int>, "count": <int>} for all part numbers and MQIs in qn_historical.
    """

    data = request.get_json(silent=True) or {}
    part_number = data.get('partNumber')
    startDate = data.get('startDate')
    endDate = data.get('endDate')
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    collection = db[QN_PARETO_COLLECTION]
    pipeline = []
    if part_number:
        pipeline.append({"$match": {"Part Number": part_number}})
    if startDate :
        pipeline.append({"$match": {"Received Date": {"$gte": startDate}}})
    if endDate:
        pipeline.append({"$match": {"Received Date": {"$lte": endDate}}})
    from datetime import datetime
    # Get date range from payload
    start_date_str = data.get('startDate')
    end_date_str = data.get('endDate')
    date_gte = datetime.strptime(start_date_str, "%Y-%m-%d") if start_date_str else None
    date_lte = datetime.strptime(end_date_str, "%Y-%m-%d") if end_date_str else None

    pipeline = []
    # Convert 'Received Date' string to date object, handling both dd-mm-yyyy and m/d/yyyy
    pipeline.append({
        "$addFields": {
            "Received_Date_obj": {
                "$switch": {
                    "branches": [
                        {
                            "case": {
                                "$regexMatch": {
                                    "input": "$Received Date",
                                    "regex": "^\\d{2}-\\d{2}-\\d{4}$"
                                }
                            },
                            "then": {
                                "$dateFromString": {
                                    "dateString": "$Received Date",
                                    "format": "%d-%m-%Y"
                                }
                            }
                        },
                        {
                            "case": {
                                "$regexMatch": {
                                    "input": "$Received Date",
                                    "regex": "^\\d{1,2}/\\d{1,2}/\\d{4}$"
                                }
                            },
                            "then": {
                                "$dateFromString": {
                                    "dateString": "$Received Date",
                                    "format": "%m/%d/%Y"
                                }
                            }
                        }
                    ],
                    "default": None
                }
            }
        }
    })
    # Date range filter
    if date_gte:
        pipeline.append({"$match": {"Received_Date_obj": {"$gte": date_gte}}})
    if date_lte:
        pipeline.append({"$match": {"Received_Date_obj": {"$lte": date_lte}}})
    if part_number:
        pipeline.append({"$match": {"Part Number": part_number}})
    pipeline.extend([
        {"$group": {
            "_id": "$MQI",
            "count": {"$sum": 1},
            "part_numbers": {"$addToSet": "$Part Number"},
            "short_text": {"$first": "$Short Text"},
            "defect_code": {"$first": "$Defect Code"}
        }},
        {"$sort": {"count": -1, "_id": 1}},
        {"$setWindowFields": {
            "partitionBy": None,
            "sortBy": {"count": -1, "_id": 1},
            "output": {
                "total_count": {"$sum": "$count", "window": {"documents": ["unbounded", "unbounded"]}},
                "cumulative_count": {"$sum": "$count", "window": {"documents": ["unbounded", "current"]}}
            }
        }},
        {"$project": {
            "MQI": "$_id",
            "count": 1,
            "cumulative_percentage": {
                "$concat": [
                    {"$toString": {"$round": [{"$multiply": [ {"$divide": ["$cumulative_count", "$total_count"] }, 100 ]}, 2]}}, "%"
                ]
            },
            "part_numbers": 1,
            "short_text": 1,
            "defect_code": 1,
            "_id": 0
        }}
    ])
    print(pipeline)
    mqi_all = list(collection.aggregate(pipeline))
    # Filter out entries where MQI is NA or None
    mqi_all = [item for item in mqi_all if item.get('MQI', item.get('_id')) not in [None, '', 'NA', 'na', 'Na', 'n/a', 'N/A', 0]]
    mqi_results = mqi_all[:10]
    # Recalculate cumulative_percentage for only the top 10
    total_count = sum(item['count'] for item in mqi_results)
    cum_count = 0
    for item in mqi_results:
        cum_count += item['count']
        item['cumulative_percentage'] = f"{round((cum_count/total_count)*100, 2)}%" if total_count > 0 else "0.00%"
        if part_number:
            item['part_numbers'] = [part_number]

    # Reviewer Feedback pipeline (reuse date filtering logic)
    reviewer_pipeline = []
    reviewer_pipeline.append({
        "$addFields": {
            "Received_Date_obj": {
                "$switch": {
                    "branches": [
                        {
                            "case": {
                                "$regexMatch": {
                                    "input": "$Received Date",
                                    "regex": "^\\d{2}-\\d{2}-\\d{4}$"
                                }
                            },
                            "then": {
                                "$dateFromString": {
                                    "dateString": "$Received Date",
                                    "format": "%d-%m-%Y"
                                }
                            }
                        },
                        {
                            "case": {
                                "$regexMatch": {
                                    "input": "$Received Date",
                                    "regex": "^\\d{1,2}/\\d{1,2}/\\d{4}$"
                                }
                            },
                            "then": {
                                "$dateFromString": {
                                    "dateString": "$Received Date",
                                    "format": "%m/%d/%Y"
                                }
                            }
                        }
                    ],
                    "default": None
                }
            }
        }
    })
    if date_gte:
        reviewer_pipeline.append({"$match": {"Received_Date_obj": {"$gte": date_gte}}})
    if date_lte:
        reviewer_pipeline.append({"$match": {"Received_Date_obj": {"$lte": date_lte}}})
    # Optionally filter by part_number for reviewer feedback breakdown
    if part_number:
        reviewer_pipeline.append({"$match": {"Part Number": part_number}})
    reviewer_pipeline.extend([
        {"$group": {
            "_id": {"Reviewer Feedback": "$Reviewer Feedback", "MQI": "$MQI"},
            "count": {"$sum": 1},
            "part_numbers": {"$addToSet": "$Part Number"},
            "short_text": {"$first": "$Short Text"},
            "defect_code": {"$first": "$Defect Code"}
        }},
        {"$sort": {"_id.Reviewer Feedback": 1, "count": -1, "_id.MQI": 1}},
        # Group again by Reviewer Feedback to build mqi_breakdown
        {"$group": {
            "_id": "$_id.Reviewer Feedback",
            "total_count": {"$sum": "$count"},
            "part_numbers": {"$first": "$part_numbers"},
            "mqi_breakdown": {"$push": {"MQI": "$_id.MQI", "count": "$count", "short_text": "$short_text", "defect_code": "$defect_code"}}
        }},
        {"$sort": {"total_count": -1, "_id": 1}},
    ])
    reviewer_all = list(collection.aggregate(reviewer_pipeline))
    reviewer_results = reviewer_all[:10]
    # Remove NA/None MQI from mqi_breakdown in reviewer_results and recalculate reviewer count
    for item in reviewer_results:
        if "mqi_breakdown" in item:
            # Filter out NA/None/0 MQI first and limit to 10 before calculating cumulative_percentage
            filtered_mqi = [mqi for mqi in item["mqi_breakdown"] if mqi.get("MQI") not in [None, '', 'NA', 'na', 'Na', 'n/a', 'N/A', 0]][:10]
            # Calculate cumulative_percentage for mqi_breakdown (running total)
            total = sum(mqi["count"] for mqi in filtered_mqi)
            mqi_cum = 0
            for mqi in filtered_mqi:
                mqi_cum += mqi["count"]
                mqi["cumulative_percentage"] = f"{round((mqi_cum/total)*100, 2)}%" if total > 0 else "0.00%"
            item["mqi_breakdown"] = filtered_mqi
            # Update reviewer count to match the sum of filtered MQI breakdown counts
            item["total_count"] = total
    # Calculate cumulative percentage for reviewer_feedback (top 10 only)
    total_count = sum(item['total_count'] for item in reviewer_results)
    cum_count = 0
    for item in reviewer_results:
        total = item["total_count"]
        cum_count += total
        # Calculate cumulative percentage for top level (running total)
        item["cumulative_percentage"] = f"{round((cum_count/total_count)*100, 2)}%" if total_count > 0 else "0.00%"
        # Set part_numbers as required
        if part_number:
            item["part_numbers"] = [part_number]
        # Rename fields for output
        item["Reviewer Feedback"] = item.pop("_id")
        item["count"] = item.pop("total_count")
    # Vendor pipeline with MQI breakdown (similar to reviewer_feedback)
    vendor_pipeline = []
    vendor_pipeline.append({
        "$addFields": {
            "Received_Date_obj": {
                "$switch": {
                    "branches": [
                        {
                            "case": {
                                "$regexMatch": {
                                    "input": "$Received Date",
                                    "regex": "^\\d{2}-\\d{2}-\\d{4}$"
                                }
                            },
                            "then": {
                                "$dateFromString": {
                                    "dateString": "$Received Date",
                                    "format": "%d-%m-%Y"
                                }
                            }
                        },
                        {
                            "case": {
                                "$regexMatch": {
                                    "input": "$Received Date",
                                    "regex": "^\\d{1,2}/\\d{1,2}/\\d{4}$"
                                }
                            },
                            "then": {
                                "$dateFromString": {
                                    "dateString": "$Received Date",
                                    "format": "%m/%d/%Y"
                                }
                            }
                        }
                    ],
                    "default": None
                }
            }
        }
    })
    if date_gte:
        vendor_pipeline.append({"$match": {"Received_Date_obj": {"$gte": date_gte}}})
    if date_lte:
        vendor_pipeline.append({"$match": {"Received_Date_obj": {"$lte": date_lte}}})
    # Optionally filter by part_number for vendor breakdown
    if part_number:
        vendor_pipeline.append({"$match": {"Part Number": part_number}})
    vendor_pipeline.extend([
        {"$group": {
            "_id": {"Vendor": "$Vendor", "MQI": "$MQI"},
            "count": {"$sum": 1},
            "part_numbers": {"$addToSet": "$Part Number"},
            "short_text": {"$first": "$Short Text"},
            "defect_code": {"$first": "$Defect Code"}
        }},
        {"$sort": {"_id.Vendor": 1, "count": -1, "_id.MQI": 1}},
        # Group again by Vendor to build mqi_breakdown
        {"$group": {
            "_id": "$_id.Vendor",
            "total_count": {"$sum": "$count"},
            "part_numbers": {"$first": "$part_numbers"},
            "mqi_breakdown": {"$push": {"MQI": "$_id.MQI", "count": "$count", "short_text": "$short_text", "defect_code": "$defect_code"}}
        }},
        {"$sort": {"total_count": -1, "_id": 1}},
    ])
    vendor_all = list(collection.aggregate(vendor_pipeline))
    vendor_results = vendor_all[:10]
    # Remove NA/None MQI from mqi_breakdown in vendor_results and recalculate vendor count
    for item in vendor_results:
        if "mqi_breakdown" in item:
            # Filter out NA/None/0 MQI first and limit to 10 before calculating cumulative_percentage
            filtered_mqi = [mqi for mqi in item["mqi_breakdown"] if mqi.get("MQI") not in [None, '', 'NA', 'na', 'Na', 'n/a', 'N/A', 0]][:10]
            # Calculate cumulative_percentage for mqi_breakdown (running total)
            total = sum(mqi["count"] for mqi in filtered_mqi)
            mqi_cum = 0
            for mqi in filtered_mqi:
                mqi_cum += mqi["count"]
                mqi["cumulative_percentage"] = f"{round((mqi_cum/total)*100, 2)}%" if total > 0 else "0.00%"
            item["mqi_breakdown"] = filtered_mqi
            # Update vendor count to match the sum of filtered MQI breakdown counts
            item["total_count"] = total
    # Calculate cumulative percentage for vendor (top 10 only)
    total_count = sum(item['total_count'] for item in vendor_results)
    cum_count = 0
    for item in vendor_results:
        total = item["total_count"]
        cum_count += total
        # Calculate cumulative percentage for top level (running total)
        item["cumulative_percentage"] = f"{round((cum_count/total_count)*100, 2)}%" if total_count > 0 else "0.00%"
        # Set part_numbers as required
        if part_number:
            item["part_numbers"] = [part_number]
        # Rename fields for output
        item["Vendor"] = item.pop("_id")
        item["count"] = item.pop("total_count")

    # Get all unique part numbers as a plain list
    part_numbers_list = sorted([pn for pn in collection.distinct("Part Number") if pn is not None])

    return jsonify({
        "mqi": mqi_results,
        "reviewer_feedback": reviewer_results,
        "vendor": vendor_results,
        "part_numbers": part_numbers_list
    }), 200


@mqi_counts_by_part_api.route('/mqi_trend_analysis', methods=['POST'])
def mqi_trend_analysis():
    """
    Returns trend analysis of a particular MQI showing count of occurrences in each month 
    of the current year along with cumulative percentage. Optionally filters by date range.
    """
    
    data = request.get_json(silent=True) or {}
    target_mqi = data.get('mqi')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    
    if not target_mqi:
        return jsonify({"error": "MQI parameter is required"}), 400
    
    # Convert target_mqi to number if it's a string that represents a number (including decimals)
    try:
        # Check if it's a decimal number
        if '.' in str(target_mqi):
            target_mqi_num = float(target_mqi)
        elif str(target_mqi).isdigit():
            target_mqi_num = int(target_mqi)
        else:
            target_mqi_num = target_mqi
    except (ValueError, TypeError):
        target_mqi_num = target_mqi
    
    # Parse optional date range
    date_gte = None
    date_lte = None
    if start_date_str:
        try:
            date_gte = datetime.strptime(start_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
    
    if end_date_str:
        try:
            date_lte = datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
    
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    collection = db[QN_PARETO_COLLECTION]
    
    current_year = datetime.now().year
    
    # Pipeline for trend analysis
    trend_pipeline = [
        # Convert 'Received Date' string to date object, handling both dd-mm-yyyy and m/d/yyyy
        {
            "$addFields": {
                "Received_Date_obj": {
                    "$switch": {
                        "branches": [
                            {
                                "case": {
                                    "$regexMatch": {
                                        "input": "$Received Date",
                                        "regex": "^\\d{2}-\\d{2}-\\d{4}$"
                                    }
                                },
                                "then": {
                                    "$dateFromString": {
                                        "dateString": "$Received Date",
                                        "format": "%d-%m-%Y"
                                    }
                                }
                            },
                            {
                                "case": {
                                    "$regexMatch": {
                                        "input": "$Received Date",
                                        "regex": "^\\d{1,2}/\\d{1,2}/\\d{4}$"
                                    }
                                },
                                "then": {
                                    "$dateFromString": {
                                        "dateString": "$Received Date",
                                        "format": "%m/%d/%Y"
                                    }
                                }
                            }
                        ],
                        "default": None
                    }
                },
                # Convert MQI to number if it's a string that represents a number (including decimals)
                "MQI_normalized": {
                    "$cond": {
                        "if": {
                            "$and": [
                                {"$ne": ["$MQI", None]},
                                {"$ne": ["$MQI", ""]},
                                {
                                    "$or": [
                                        {"$regexMatch": {"input": {"$toString": "$MQI"}, "regex": "^\\d+$"}},
                                        {"$regexMatch": {"input": {"$toString": "$MQI"}, "regex": "^\\d+\\.\\d+$"}}
                                    ]
                                }
                            ]
                        },
                        "then": {
                            "$cond": {
                                "if": {"$regexMatch": {"input": {"$toString": "$MQI"}, "regex": "^\\d+\\.\\d+$"}},
                                "then": {"$toDouble": "$MQI"},
                                "else": {"$toInt": "$MQI"}
                            }
                        },
                        "else": "$MQI"
                    }
                }
            }
        }
    ]
    
    # Build match conditions
    match_conditions = [
        {"Received_Date_obj": {"$ne": None}},
        {
            "$or": [
                {"MQI_normalized": target_mqi_num},
                {"MQI": target_mqi},
                {"MQI": str(target_mqi)}
            ]
        }
    ]
    
    # Add date range filters if provided
    if date_gte:
        match_conditions.append({"Received_Date_obj": {"$gte": date_gte}})
    
    if date_lte:
        match_conditions.append({"Received_Date_obj": {"$lte": date_lte}})
    
    # If no date range provided, default to current year
    if not date_gte and not date_lte:
        match_conditions.append({"$expr": {"$eq": [{"$year": "$Received_Date_obj"}, current_year]}})
    
    trend_pipeline.append({
        "$match": {
            "$and": match_conditions
        }
    })
    
    # Continue with the rest of the pipeline
    trend_pipeline.extend([
        # Group by year and month and count occurrences
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$Received_Date_obj"},
                    "month": {"$month": "$Received_Date_obj"}
                },
                "count": {"$sum": 1},
                "part_numbers": {"$addToSet": "$Part Number"}
            }
        },
        # Sort by year and month
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        # Add month names and calculate cumulative data
        {
            "$group": {
                "_id": None,
                "monthly_data": {
                    "$push": {
                        "year": "$_id.year",
                        "month_number": "$_id.month",
                        "count": "$count",
                        "part_numbers": "$part_numbers"
                    }
                },
                "total_count": {"$sum": "$count"}
            }
        }
    ])
    
    result = list(collection.aggregate(trend_pipeline))
    
    # Determine the date range for response
    if date_gte and date_lte:
        start_year = date_gte.year
        end_year = date_lte.year
        start_month = date_gte.month
        end_month = date_lte.month
        date_range_info = f"{start_date_str} to {end_date_str}"
    elif date_gte:
        start_year = date_gte.year
        end_year = datetime.now().year
        start_month = date_gte.month
        end_month = datetime.now().month
        date_range_info = f"from {start_date_str}"
    elif date_lte:
        start_year = current_year
        end_year = date_lte.year
        start_month = 1
        end_month = date_lte.month
        date_range_info = f"until {end_date_str}"
    else:
        start_year = current_year
        end_year = current_year
        start_month = 1
        end_month = datetime.now().month
        date_range_info = f"current year {current_year}"
    
    if not result:
        return jsonify({
            "mqi": target_mqi,
            "date_range": date_range_info,
            "monthly_trend": [],
            "total_count": 0,
            "message": f"No data found for MQI '{target_mqi}' in the specified date range"
        }), 200
    
    monthly_data = result[0].get('monthly_data', [])
    total_count = result[0].get('total_count', 0)
    
    # Month names mapping
    month_names = {
        1: "January", 2: "February", 3: "March", 4: "April",
        5: "May", 6: "June", 7: "July", 8: "August", 
        9: "September", 10: "October", 11: "November", 12: "December"
    }
    
    # Create complete monthly trend data based on date range
    monthly_trend = []
    cumulative_count = 0
    
    # Sort monthly_data by year and month for proper chronological order
    monthly_data.sort(key=lambda x: (x['year'], x['month_number']))
    
    # Create a lookup for actual data using year-month key
    data_lookup = {f"{item['year']}-{item['month_number']}": item for item in monthly_data}
    
    # Generate months based on the date range
    if start_year == end_year:
        # Same year, iterate from start_month to end_month
        for month_num in range(start_month, end_month + 1):
            key = f"{start_year}-{month_num}"
            if key in data_lookup:
                count = data_lookup[key]['count']
                part_numbers = data_lookup[key]['part_numbers']
            else:
                count = 0
                part_numbers = []
            
            cumulative_count += count
            cumulative_percentage = f"{round((cumulative_count/total_count)*100, 2)}%" if total_count > 0 else "0.00%"
            
            monthly_trend.append({
                "month": month_names[month_num],
                "month_number": month_num,
                "year": start_year,
                "count": count,
                "cumulative_count": cumulative_count,
                "cumulative_percentage": cumulative_percentage,
                "part_numbers": sorted(part_numbers) if part_numbers else []
            })
    else:
        # Multiple years - generate all months in the date range chronologically
        current_year = start_year
        current_month = start_month
        
        while (current_year < end_year) or (current_year == end_year and current_month <= end_month):
            key = f"{current_year}-{current_month}"
            if key in data_lookup:
                count = data_lookup[key]['count']
                part_numbers = data_lookup[key]['part_numbers']
            else:
                count = 0
                part_numbers = []
            
            cumulative_count += count
            cumulative_percentage = f"{round((cumulative_count/total_count)*100, 2)}%" if total_count > 0 else "0.00%"
            
            monthly_trend.append({
                "month": month_names[current_month],
                "month_number": current_month,
                "year": current_year,
                "count": count,
                "cumulative_count": cumulative_count,
                "cumulative_percentage": cumulative_percentage,
                "part_numbers": sorted(part_numbers) if part_numbers else []
            })
            
            # Move to next month
            current_month += 1
            if current_month > 12:
                current_month = 1
                current_year += 1
    
    return jsonify({
        "mqi": target_mqi,
        "date_range": date_range_info,
        "monthly_trend": monthly_trend,
        "total_count": total_count
    }), 200
