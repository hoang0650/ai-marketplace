# Put the PayPal Apple Pay domain association file here.

# Live URL (must be HTTPS 200, no redirect):
#   https://aimarkets.vn/.well-known/apple-developer-merchantid-domain-association
#   https://www.aimarkets.vn/.well-known/apple-developer-merchantid-domain-association
#
# 1. PayPal Developer Dashboard → App → Apple Pay → Manage → download the file
#    (sandbox and live files are different).
# 2. Save it as exactly:
#    apple-developer-merchantid-domain-association
#    (no .txt extension)
# 3. Serve Content-Type: application/octet-stream
# 4. Register the domain in PayPal, then wait for Apple to fetch this file.
#
# See docs/apple-google-pay-setup.md
