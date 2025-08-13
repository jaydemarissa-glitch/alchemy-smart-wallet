#!/bin/bash

# Deployment script for Alchemy Smart Wallet
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
PROJECT_NAME="alchemy-wallet"

echo "🚀 Deploying $PROJECT_NAME to $ENVIRONMENT..."

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Error: Environment must be 'staging' or 'production'"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Load environment variables
if [[ -f ".env.$ENVIRONMENT" ]]; then
    echo "📋 Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env.$ENVIRONMENT not found, using defaults"
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t "$PROJECT_NAME:$ENVIRONMENT" .

# Tag for registry (if production)
if [[ "$ENVIRONMENT" == "production" ]]; then
    # You would tag with your registry here
    # docker tag "$PROJECT_NAME:$ENVIRONMENT" "your-registry.com/$PROJECT_NAME:latest"
    echo "🏷️  Tagged image for production registry"
fi

# Deploy based on environment
if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo "🚢 Deploying to staging environment..."
    
    # Stop existing containers
    docker-compose -f docker-compose.staging.yml down
    
    # Start new deployment
    docker-compose -f docker-compose.staging.yml up -d
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    # Health check
    echo "🔍 Running health checks..."
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Staging deployment successful!"
        echo "📊 Access Grafana: http://localhost:3001"
        echo "📈 Access Prometheus: http://localhost:9090"
        echo "🌐 Application: http://localhost:3000"
    else
        echo "❌ Health check failed"
        docker-compose -f docker-compose.staging.yml logs app
        exit 1
    fi
    
elif [[ "$ENVIRONMENT" == "production" ]]; then
    echo "🚢 Deploying to production environment..."
    
    # In production, you would typically:
    # 1. Push to container registry
    # 2. Deploy via Kubernetes/ECS/Cloud Run
    # 3. Run database migrations
    # 4. Update load balancer
    # 5. Monitor deployment
    
    echo "⚠️  Production deployment requires manual configuration"
    echo "Please use your cloud provider's deployment tools"
    
    # Example for different platforms:
    echo "Examples:"
    echo "  AWS ECS: aws ecs update-service --cluster your-cluster --service $PROJECT_NAME"
    echo "  Google Cloud Run: gcloud run deploy $PROJECT_NAME --image gcr.io/your-project/$PROJECT_NAME"
    echo "  Kubernetes: kubectl set image deployment/$PROJECT_NAME app=your-registry/$PROJECT_NAME:latest"
fi

echo "🎉 Deployment completed!"