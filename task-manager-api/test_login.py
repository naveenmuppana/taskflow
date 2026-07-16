import urllib.request
import urllib.parse
import urllib.error

data = urllib.parse.urlencode({'username': 'you@example.com', 'password': 'password'}).encode()
req = urllib.request.Request('http://localhost:8000/api/v1/auth/login', data=data)
try:
    res = urllib.request.urlopen(req)
    print(res.read())
except urllib.error.HTTPError as e:
    print(e.code, e.read())
