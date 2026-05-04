# Contains /menu endpoint
from flask import Blueprint, request, jsonify
from datetime import datetime
from pymongo import MongoClient
from constants.database_constants import MONGO_URI, DATABASE_NAME, QN_INPUT_COLLECTION

menu_api = Blueprint('menu_api', __name__)

@menu_api.route('/menu', methods=['GET'])
def menu():
        current_timestamp = datetime.now()
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        collection1 = db[QN_INPUT_COLLECTION]
        items1 = list(collection1.find({}))
        for i in items1:
            i["_id"]=str(i["_id"])
        return(jsonify({"data":items1}))
