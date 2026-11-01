@echo off
cd C:\Users\Lenovo\Downloads\cancha-control\cancha-control\backend
if exist start.cmd del start.cmd
echo cd C:\Users\Lenovo\Downloads\cancha-control\cancha-control\backend > start.cmd
echo set PORT=5000 >> start.cmd
echo set NODE_ENV=development >> start.cmd
echo node src/server.js >> start.cmd
start /b start.cmd
timeout /t 3 /nobreak >nul
echo.
echo Backend iniciado en http://localhost:5000
echo.
cd C:\Users\Lenovo\Downloads\cancha-control\cancha-control\frontend
if exist reload.cmd del reload.cmd
echo cd C:\Users\Lenovo\Downloads\cancha-control\cancha-control\frontend > reload.cmd
echo set VITE_API_URL=http://localhost:5000/api >> reload.cmd
echo npm run dev >> reload.cmd
start /b reload.cmd
timeout /t 3 /nobreak >nul
echo.
echo Frontend iniciado en http://localhost:5175
echo.