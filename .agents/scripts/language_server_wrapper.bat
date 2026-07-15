@echo off
"C:\Users\Luke\AppData\Local\Programs\antigravity\resources\bin\language_server.exe" -api_server_url=http://%ANTIGRAVITY_LS_ADDRESS% -csrf_token=%ANTIGRAVITY_CSRF_TOKEN% %*
