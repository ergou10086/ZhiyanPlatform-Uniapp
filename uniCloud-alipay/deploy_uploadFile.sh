#!/bin/bash
# Deploy uploadFile cloud function to Tencent Cloud (CloudBase)
# Prerequisites:
# - Install CloudBase CLI: npm i -g @cloudbase/cli
# - Export environment variable TCB_ENV_ID with your env id
#
# Usage:
#   export TCB_ENV_ID=prod-xxxxx
#   bash android/uniCloud/deploy_uploadFile.sh

set -e

if [ -z "$TCB_ENV_ID" ]; then
  echo "Please set TCB_ENV_ID environment variable before running this script."
  exit 1
fi

echo "Deploying uploadFile function to env: $TCB_ENV_ID"

# Deploy using cloudbase functions:deploy
# Adjust runtime and region as needed
cloudbase functions:deploy --name uploadFile --envId "$TCB_ENV_ID" --path "./android/common/uploadFile" --runtime "Nodejs10.15" --region "ap-beijing"

echo "Deployment finished."


