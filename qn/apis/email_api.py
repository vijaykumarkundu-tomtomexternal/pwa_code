# Contains /email endpoint
from flask import Blueprint, request, jsonify

email_api = Blueprint('email_api', __name__)

@email_api.route('/email', methods=['POST'])
def email():
    req_body=request.get_json()
    username=req_body["username"]
    password=req_body["password"]
    if(username=="qn" and password=="qn@12345"):
        return("success")
    return("invalid credential")
