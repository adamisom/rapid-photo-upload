#!/bin/bash

# Script to replace us-east-1 with us-east-2 in all non-gitignored files
# Excludes: .git/, node_modules/, target/, docs/chat-logs/

echo "🔍 Finding files with 'us-east-1'..."

# Find all files tracked by git (respects .gitignore)
# Exclude docs/chat-logs/ directory
# Replace us-east-1 with us-east-2

git grep -l "us-east-1" | grep -v "^docs/chat-logs/" | while read -r file; do
  echo "  📝 Updating: $file"
  
  # Use sed to replace (macOS compatible)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed requires '' after -i
    sed -i '' 's/us-east-1/us-east-2/g' "$file"
  else
    # Linux sed
    sed -i 's/us-east-1/us-east-2/g' "$file"
  fi
done

echo ""
echo "✅ Replacement complete!"
echo ""
echo "📊 Summary of changes:"
git diff --stat

echo ""
echo "🔍 Verification - files still containing 'us-east-1' (should only be in chat-logs):"
git grep "us-east-1" | cut -d: -f1 | sort -u

