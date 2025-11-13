#!/bin/bash
export JWT_SECRET="${JWT_SECRET:-ROsXsqfH04SN1TLInOI8hTNS2dYgwBBHleq5Y8S1QEy2dQRlQS3MKcSCKJdsMYhv}"
./mvnw spring-boot:run \
  -Dspring.datasource.url=jdbc:postgresql://localhost:5432/rapidphoto_dev \
  -Dspring.datasource.username=postgres \
  -Dspring.datasource.password=postgres \
  -Djwt.secret="${JWT_SECRET}" \
  2>&1 | grep -v "DEBUG" | grep -v "TRACE" | head -40
