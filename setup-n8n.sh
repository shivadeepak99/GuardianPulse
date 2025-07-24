#!/bin/bash

# GuardianPulse + n8n Setup Script
# This script sets up the complete stack with n8n integration

echo "🚀 Setting up GuardianPulse with n8n Integration..."

# Create required directories
echo "📁 Creating n8n directories..."
mkdir -p n8n/workflows
mkdir -p n8n/credentials

# Set proper permissions for n8n data
chmod 755 n8n
chmod 755 n8n/workflows
chmod 755 n8n/credentials

# Start the complete stack
echo "🐳 Starting Docker containers..."
docker-compose down
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if all services are running
echo "🔍 Checking service health..."

# Check PostgreSQL
if docker exec guardian-pulse-postgres pg_isready -U guardianpulse > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
    exit 1
fi

# Check Redis
if docker exec guardian-pulse-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
    exit 1
fi

# Check API
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ API is ready"
else
    echo "❌ API is not ready"
    exit 1
fi

# Check n8n
if curl -s http://localhost:5678/healthz > /dev/null; then
    echo "✅ n8n is ready"
else
    echo "❌ n8n is not ready"
    exit 1
fi

echo ""
echo "🎉 GuardianPulse + n8n setup complete!"
echo ""
echo "🌐 Service URLs:"
echo "   API:         http://localhost:8080"
echo "   API Docs:    http://localhost:8080/api-docs"
echo "   n8n:         http://localhost:5678"
echo "   PostgreSQL:  localhost:5432"
echo "   Redis:       localhost:6379"
echo ""
echo "🔐 n8n Login Credentials:"
echo "   Username: guardian_admin"
echo "   Password: guardian_n8n_2025"
echo ""
echo "📚 Next Steps:"
echo "   1. Open n8n at http://localhost:5678"
echo "   2. Import workflow templates from n8n/workflows/"
echo "   3. Configure credentials (Twilio, SendGrid, AWS)"
echo "   4. Test workflows with your API"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
echo "Happy workflow automation! 🤖"
