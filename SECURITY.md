# Security Policy

## 🔒 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

We actively support the latest major version with security updates.

## 🛡️ Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues via one of the following methods:

1. **GitHub Security Advisory** (Preferred)
   - Go to the [Security tab](https://github.com/eloinsight/eloinsight/security)
   - Click "Report a vulnerability"
   - Fill out the private security advisory form

2. **Email**
   - Send details to: security@eloinsight.org
   - Use subject line: `[SECURITY] Brief description`

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
- **Location** of the vulnerable code (file path, line numbers if known)
- **Steps to reproduce** the vulnerability
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up questions

### Response Timeline

| Action | Timeframe |
|--------|-----------|
| Initial response | Within 48 hours |
| Vulnerability assessment | Within 7 days |
| Fix development | Depends on severity |
| Security advisory release | After fix is deployed |

### Severity Levels

| Severity | Examples | Response Time |
|----------|----------|---------------|
| **Critical** | RCE, Auth bypass, Data breach | Immediate (within 24h) |
| **High** | SQL injection, XSS with session theft | 7 days |
| **Medium** | CSRF, Limited data exposure | 14 days |
| **Low** | Information disclosure, Minor bugs | 30 days |

## 🔐 Security Best Practices

### For Users

1. **Use strong passwords** for your EloInsight account
2. **Enable 2FA** when available
3. **Don't share your API keys** or tokens
4. **Use HTTPS** when self-hosting
5. **Keep your instance updated** to the latest version

### For Self-Hosting

1. **Use environment variables** for sensitive configuration
2. **Enable HTTPS** with a valid SSL certificate
3. **Use strong database passwords**
4. **Configure proper CORS settings**
5. **Keep dependencies updated**
6. **Use a reverse proxy** (nginx, Caddy)
7. **Enable rate limiting**
8. **Regular backups** of your database

### For API Access

```bash
# Good: Use environment variables
export JWT_SECRET="your-secure-secret-here"

# Bad: Never hardcode secrets
JWT_SECRET="hardcoded-secret"  # DON'T DO THIS
```

## 🔍 Security Measures We Implement

### Authentication & Authorization
- [x] JWT-based authentication with short expiration
- [x] Refresh token rotation
- [x] Password hashing with bcrypt
- [x] Rate limiting on auth endpoints
- [x] Account lockout after failed attempts

### Data Protection
- [x] Input validation on all endpoints
- [x] Output encoding to prevent XSS
- [x] SQL injection prevention (parameterized queries)
- [x] CSRF protection
- [x] Secure headers (HSTS, CSP, X-Frame-Options)

### Infrastructure
- [x] No secrets in source code
- [x] Environment-based configuration
- [x] Minimal Docker image attack surface
- [x] Health checks and monitoring
- [x] Audit logging

## 🏆 Security Acknowledgments

We thank the following security researchers for responsibly disclosing vulnerabilities:

<!-- 
| Name | Vulnerability | Date |
|------|--------------|------|
| @researcher | Description | YYYY-MM-DD |
-->

*No vulnerabilities reported yet.*

---

## 📜 Security-Related Policies

### Dependency Management
- We use Dependabot for automated security updates
- Critical vulnerabilities are patched within 7 days
- Dependencies are audited with `npm audit` / `go mod verify`

### Code Review
- All code changes require PR review
- Security-sensitive changes require additional review
- Automated security scanning in CI pipeline

### Incident Response
- We have a documented incident response plan
- Security incidents are reviewed and documented
- Post-mortems are conducted for significant incidents

---

Thank you for helping keep EloInsight and its users safe! 🙏
