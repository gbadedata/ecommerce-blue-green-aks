#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${1:-ecommerce-bluegreen}"
DURATION_SECONDS="${2:-60}"

kubectl run aks-curl-tester \
  -n "$NAMESPACE" \
  --image=curlimages/curl:8.11.1 \
  --restart=Never \
  --rm -i \
  --command -- sh -c "
    failures=0
    requests=0
    end=\$(( \$(date +%s) + $DURATION_SECONDS ))

    echo 'Starting AKS in-cluster zero-downtime test'
    echo 'Target: http://ecommerce-service/api/v1/version'
    echo 'Duration seconds: $DURATION_SECONDS'
    echo

    while [ \$(date +%s) -lt \$end ]; do
      response=\$(curl -s -w ' HTTP_STATUS=%{http_code}' http://ecommerce-service/api/v1/version || echo ' HTTP_STATUS=000')
      requests=\$((requests + 1))

      case \"\$response\" in
        *HTTP_STATUS=200*)
          echo \"OK \$response\"
          ;;
        *)
          failures=\$((failures + 1))
          echo \"FAILED \$response\"
          ;;
      esac

      sleep 1
    done

    echo
    echo \"Total requests: \$requests\"
    echo \"Failed requests: \$failures\"

    if [ \"\$failures\" -ne 0 ]; then
      exit 1
    fi
  "
