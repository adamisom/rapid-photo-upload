#!/bin/bash
echo "Testing database connection..."
PGHOST=localhost PGPORT=5432 PGDATABASE=rapidphoto_dev PGUSER=postgres PGPASSWORD=postgres \
java -cp "$(./mvnw dependency:build-classpath -q -DincludeScope=runtime | tail -1):target/classes" \
  -Djdbc:postgresql://localhost:5432/rapidphoto_dev \
  org.postgresql.Driver 2>&1 || echo "Connection test"
