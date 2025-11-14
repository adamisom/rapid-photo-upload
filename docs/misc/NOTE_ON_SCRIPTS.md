# Scripts Overview

Brief breakdown of all scripts in the project.

## backend/scripts/

- `delete-all-users.sh` - Deletes all users from local dev database (localhost:5432/rapidphoto_dev), cascades to photos and batches
- `delete-all-photos.sh` - Deletes all photos and upload batches from local dev database, keeps users intact
- `delete-all-users-prod.sh` - Deletes all users from production Railway database (uses DATABASE_URL), cascades to photos and batches

## scripts/

- `load-test.sh` - End-to-end automated upload test with multiple concurrent requests
- `replace-aws-region.sh` - Replaces us-east-1 with us-east-2 in all non-gitignored files
- `start-backend.sh` - Starts backend with required environment variables and prerequisites
- `test-db-connection.sh` - Tests database connection to local PostgreSQL
- `test-jwt.sh` - Tests JWT_SECRET and starts Spring Boot with default JWT secret
- `test-spring-props.sh` - Tests Spring Boot properties with local database connection
- `update-s3-cors.sh` - Updates S3 CORS configuration for Railway deployment to allow uploads

