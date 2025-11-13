#!/bin/bash
# Start backend with required environment variables

export JWT_SECRET="dev-secret-minimum-64-characters-long-for-local-development-only-12345"

cd backend
./mvnw spring-boot:run
