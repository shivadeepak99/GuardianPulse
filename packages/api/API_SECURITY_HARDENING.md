# API Security Hardening Documentation

## Overview

This document outlines the comprehensive security measures implemented in the GuardianPulse API to protect against common web vulnerabilities and attacks.

## Implemented Security Features

### 1. Rate Limiting

Multiple rate limiting configurations protect different types of endpoints:

#### General API Rate Limiting

- **Path**: All `/api/*` endpoints
- **Limit**: 100 requests per 15 minutes per IP
- **Purpose**: Prevents API abuse and DoS attacks

#### Authentication Rate Limiting

- **Endpoints**:
  - `POST /api/v1/users/register`
  - `POST /api/v1/users/login`
- **Limit**: 5 requests per 15 minutes per IP
- **Purpose**: Prevents brute force attacks on authentication
- **Special**: Only counts failed attempts (skipSuccessfulRequests: true)

#### Live Session Rate Limiting

- **Endpoints**:
  - `POST /api/v1/incidents/process-sensor-data`
- **Limit**: 60 requests per minute per IP
- **Purpose**: Allows frequent location/sensor updates during live sessions while preventing abuse

#### Password Reset Rate Limiting

- **Limit**: 3 requests per hour per IP
- **Purpose**: Prevents password reset abuse
- **Status**: Ready for implementation when password reset feature is added

### 2. Security Headers (Helmet.js)

Comprehensive HTTP security headers using Helmet.js:

#### Content Security Policy (CSP)

```
default-src 'self'
style-src 'self' 'unsafe-inline' https:
script-src 'self' https:
img-src 'self' data: https:
connect-src 'self' https: wss: ws:
font-src 'self' https:
object-src 'none'
media-src 'self' https:
frame-src 'none'
```

#### HTTP Strict Transport Security (HSTS)

- **Max Age**: 1 year (31,536,000 seconds)
- **Include Subdomains**: Yes
- **Preload**: Yes

#### Other Security Headers

- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: no-referrer
- **Cross-Origin-Resource-Policy**: cross-origin
- **DNS Prefetch Control**: Disabled
- **Hide Powered-By**: Express header removed

### 3. Security Monitoring

Real-time suspicious activity detection:

#### Suspicious User Agent Detection

Monitors for common attack tools:

- Bots, crawlers, spiders
- Security scanners (nikto, nmap, sqlmap)
- Automated tools (curl, wget, python-requests)

#### Malicious Request Pattern Detection

Scans URLs for attack patterns:

- Path traversal attempts (`../`)
- System file access (`/etc/passwd`, `/proc/self/environ`)
- XSS patterns (`<script>`, `javascript:`, `onload=`)
- SQL injection patterns (`union select`, `drop table`)
- Code injection attempts (`exec(`, `system(`)

### 4. Request Size Limits

- **JSON Body Limit**: 10MB
- **URL Encoded Body Limit**: 10MB
- **Custom Size Validation**: Available for specific endpoints

### 5. IP Whitelisting (Available)

- Framework for restricting admin endpoints to specific IPs
- Automatically allows localhost for development
- Ready for implementation on sensitive endpoints

## Security Logging

All security events are logged with comprehensive context:

- IP addresses
- User agents
- Request paths and methods
- Headers (for suspicious requests)
- Timestamps

## Rate Limit Response Format

Standardized error responses for rate limit violations:

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": "15 minutes"
}
```

## Implementation Files

### Core Security Middleware

- `src/middlewares/security.middleware.ts` - Main security configurations
- `src/middlewares/index.ts` - Middleware exports

### Applied Security

- `src/index.ts` - Global security middleware application
- `src/routes/user.routes.ts` - Authentication rate limiting
- `src/routes/incidents.ts` - Live session rate limiting

## Security Recommendations

### Immediate Considerations

1. **Environment Configuration**: Ensure proper CORS origins in production
2. **HTTPS Enforcement**: Enable HSTS only when HTTPS is properly configured
3. **Monitoring**: Set up alerts for repeated security violations
4. **IP Whitelisting**: Consider implementing for admin endpoints

### Future Enhancements

1. **Geographic Rate Limiting**: Different limits based on user location
2. **User-Based Rate Limiting**: Track limits per authenticated user
3. **Dynamic Rate Limiting**: Adjust limits based on system load
4. **Security Headers Testing**: Regular validation of CSP and other headers

## Testing Security Features

### Rate Limiting Tests

```bash
# Test general rate limiting
for i in {1..150}; do curl -X GET "http://localhost:3001/api/v1/health"; done

# Test auth rate limiting
for i in {1..10}; do curl -X POST "http://localhost:3001/api/v1/users/login" -d '{"email":"test","password":"test"}' -H "Content-Type: application/json"; done

# Test live session rate limiting
for i in {1..100}; do curl -X POST "http://localhost:3001/api/v1/incidents/process-sensor-data" -H "Authorization: Bearer TOKEN"; done
```

### Security Headers Validation

```bash
# Check security headers
curl -I "http://localhost:3001/api/v1/health"

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: no-referrer
```

## Compliance and Standards

This implementation addresses security requirements for:

- **OWASP Top 10** vulnerabilities
- **Common web application attacks**
- **API security best practices**
- **Mobile app backend security**

## Emergency Response

In case of detected attacks:

1. Check logs for patterns: `grep "Malicious request detected" logs/app.log`
2. Review rate limit violations: `grep "Rate limit exceeded" logs/app.log`
3. Consider temporary IP blocking for persistent attackers
4. Scale rate limits down if under attack

---

**Last Updated**: July 23, 2025  
**Version**: 1.0  
**Implementation Status**: ✅ Complete
