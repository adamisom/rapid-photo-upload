#!/bin/bash
export JWT_SECRET="${JWT_SECRET:-ROsXsqfH04SN1TLInOI8hTNS2dYgwBBHleq5Y8S1QEy2dQRlQS3MKcSCKJdsMYhv}"
echo "JWT_SECRET length: ${#JWT_SECRET}"
./mvnw spring-boot:run
