@echo off
echo Pushing message...
curl "http://localhost:8787/__scheduled?cron=0+0+*+*+*"
echo.
echo Push completed!
pause