# Security Assumptions and XSS Defense

## Input Sanitization
All untrusted inputs arriving via `req.body`, `req.query`, and `req.params` are actively sanitized using a recursive middleware (`src/middleware/sanitize.ts`).
We utilize the [xss](https://www.npmjs.com/package/xss) library with a strict configuration (empty whitelist) to completely strip any HTML tags, ensuring malicious payloads like `<script>` or `<img onerror=...>` are neutralized before reaching the controllers or the database.

**Security Constraints:**
- The middleware strips HTML formatting. If rich-text input is required in the future, the global sanitization middleware must be adjusted or bypassed for specific routes, and a tailored sanitizer with a proper whitelist (e.g., using `dompurify` or targeted `xss` options) must be applied locally.
- Complex objects such as `Date` and `Buffer` are explicitly skipped during recursive sanitization to avoid data corruption.

## Safe Output Encoding
By default, Express applications sending `application/json` responses naturally mitigate XSS because modern browsers will not execute scripts inside a JSON response.

However, as a defense-in-depth measure, we provide an explicit HTML encoder at `src/utils/encode.ts`. If user-generated strings ever need to be embedded into templates, concatenated into raw HTML, or returned with a `text/html` content type, developers MUST use `encodeHtml()` to properly escape `&`, `<`, `>`, `"`, and `'`.
