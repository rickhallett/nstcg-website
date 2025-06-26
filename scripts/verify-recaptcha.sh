# Example API call to assess a reCAPTCHA token
curl -X POST \
  "https://recaptchaenterprise.googleapis.com/v1/projects/nstcg-org/assessments" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "token": "RECAPTCHA_TOKEN_FROM_FRONTEND",
      "siteKey": "6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX"
    }
  }'