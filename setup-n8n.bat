@echo off
echo 🚀 Setting up GuardianPulse with n8n Integration...

REM Create required directories
echo 📁 Creating n8n directories...
if not exist "n8n" mkdir n8n
if not exist "n8n\workflows" mkdir n8n\workflows
if not exist "n8n\credentials" mkdir n8n\credentials

REM Start the complete stack
echo 🐳 Starting Docker containers...
docker-compose down
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Check if all services are running
echo 🔍 Checking service health...

REM Check PostgreSQL
docker exec guardian-pulse-postgres pg_isready -U guardianpulse >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ PostgreSQL is ready
) else (
    echo ❌ PostgreSQL is not ready
    exit /b 1
)

REM Check Redis
docker exec guardian-pulse-redis redis-cli ping >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Redis is ready
) else (
    echo ❌ Redis is not ready
    exit /b 1
)

REM Check API
curl -s http://localhost:8080/health >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ API is ready
) else (
    echo ❌ API is not ready
    exit /b 1
)

REM Check n8n
curl -s http://localhost:5678/healthz >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ n8n is ready
) else (
    echo ❌ n8n is not ready
    exit /b 1
)

echo.
echo 🎉 GuardianPulse + n8n setup complete!
echo.
echo 🌐 Service URLs:
echo    API:         http://localhost:8080
echo    API Docs:    http://localhost:8080/api-docs
echo    n8n:         http://localhost:5678
echo    PostgreSQL:  localhost:5432
echo    Redis:       localhost:6379
echo.
echo 🔐 n8n Login Credentials:
echo    Username: guardian_admin
echo    Password: guardian_n8n_2025
echo.
echo 📚 Next Steps:
echo    1. Open n8n at http://localhost:5678
echo    2. Import workflow templates from n8n/workflows/
echo    3. Configure credentials (Twilio, SendGrid, AWS)
echo    4. Test workflows with your API
echo.
echo 🔧 Useful Commands:
echo    View logs:     docker-compose logs -f
echo    Stop services: docker-compose down
echo    Restart:       docker-compose restart
echo.
echo Happy workflow automation! 🤖

pause
