# # one-shot
# npx -p google-auth-library@latest google-auth-library oauth2 \
#      --client_id=47119244873-qapjh5f0fmf8vegjcv4fnd9svkojsjuk.apps.googleusercontent.com \
#      --client_secret=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 \
#      --scope=https://www.googleapis.com/auth/gmail.send

# save the token to a file
npx -p google-auth-library@latest google-auth-library oauth2 \
     --client_id=47119244873-qapjh5f0fmf8vegjcv4fnd9svkojsjuk.apps.googleusercontent.com \
     --client_secret=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 \
     --scope=https://www.googleapis.com/auth/gmail.send \
     --save_token=token.json