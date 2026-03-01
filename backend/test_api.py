import urllib.request
import urllib.parse
import json
import sys

def test():
    # Login properly
    data = urllib.parse.urlencode({'username': 'praveen', 'password': 'ApnaLoop2024!'}).encode()
    req = urllib.request.Request('http://localhost:8000/api/auth/login', data=data)
    try:
        with urllib.request.urlopen(req) as response:
            token = json.loads(response.read())['access_token']
            print('Login OK')
    except urllib.error.HTTPError as e:
        print('Login Error:', e.code, e.read().decode())
        return

    # test users/me
    req_me = urllib.request.Request('http://localhost:8000/api/users/me', headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req_me) as response:
            print('Me OK:', response.getcode(), response.read().decode())
    except urllib.error.HTTPError as e:
        print('Me Error:', e.code, e.read().decode())
        
    # test chat/conversations
    req_chat = urllib.request.Request('http://localhost:8000/api/chat/conversations', headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req_chat) as response:
            print('Conversations OK:', response.getcode())
    except urllib.error.HTTPError as e:
        print('Conversations Error:', e.code, e.read().decode())

test()
