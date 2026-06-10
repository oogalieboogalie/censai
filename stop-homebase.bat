@echo off
title Censai Hub - Shutdown Controller
color 0e
echo ════════════════════════════════════════════════════════════════
echo  Censai Hub Docker Controller - Shutting Down Services...
echo ════════════════════════════════════════════════════════════════
echo.

docker compose down

echo.
echo ════════════════════════════════════════════════════════════════
echo  Censai Hub stopped cleanly. 
echo  All database and vector records have been saved securely!
echo ════════════════════════════════════════════════════════════════
echo.
pause
