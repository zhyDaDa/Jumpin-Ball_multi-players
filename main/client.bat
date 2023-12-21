@echo off
echo Sever Starting at [http://localhost:8088]
start "edge" "http://localhost:8088"
py -m http.server 8088
