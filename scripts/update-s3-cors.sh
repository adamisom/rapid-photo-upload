#!/bin/bash

# Update S3 CORS configuration for Railway deployment
# Run this to allow uploads from Railway frontend

BUCKET_NAME="rapidphotoupload-adamisom"

echo "🪣 Updating CORS configuration for S3 bucket: $BUCKET_NAME"

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.up.railway.app",
        "https://*.netlify.app",
        "https://*.vercel.app"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

echo ""
echo "✅ CORS configuration updated!"
echo ""
echo "Verify with:"
echo "aws s3api get-bucket-cors --bucket $BUCKET_NAME"

