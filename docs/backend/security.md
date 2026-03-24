# Security Documentation

## Overview

This document outlines the security measures, threat scenarios, and best practices for the TalentTrust Backend deployment automation pipeline.

## Security Architecture

### Defense in Depth

The deployment pipeline implements multiple layers of security:

1. **Code Level**: Input validation, secure configuration
2. **Build Level**: Dependency scanning, linting
3. **Deployment Level**: Environment validation, access controls
4. **Runtime Level**: Health checks, monitoring

## Threat Model

### Identified Threats

#### T1: Malicious Dependency Injection

**Description**: Attacker compromises npm package to inject malicious code

**Mitigation**:
- Automated `npm audit` in CI/CD pipeline
- Lock file (`package-lock.json`) ensures reproducible builds
- Regular dependency updates and security patches
- Audit level set to moderate or higher

**Severity**: High

#### T2: Unauthorized Deployment

**Description**: Unauthorized user attempts to deploy to production

**Mitigation**:
- GitHub environment protection rules
- Required approvals for production deployments
- Audit logging of all deployment activities
- Branch protection rules on `main` branch

**Severity**: Critical

#### T3: Configuration Exposure

**Description**: Sensitive configuration leaked in logs or artifacts

**Mitigation**:
- Environment variables for sensitive data
- GitHub Secrets for credentials
- No secrets in source code or logs
- `.gitignore` prevents accidental commits

**Severity**: High

#### T4: Insecure CORS Configuration

**Description**: Overly permissive CORS allows unauthorized access

**Mitigation**:
- Production validation rejects wildcard CORS
- Production validation rejects localhost origins
- Environment-specific CORS configuration
- Validation in deployment pipeline

**Severity**: Medium

#### T5: Deployment to Wrong Environment

**Description**: Production code accidentally deployed to wrong environment

**Mitigation**:
- Automated environment detection
- Explicit environment validation
- Branch-to-environment mapping
- Manual confirmation for production

**Severity**: Medium

#### T6: Rollback to Vulnerable Version

**Description**: Rollback deploys version with known vulnerabilities

**Mitigation**:
- Security scanning before rollback
- Documented rollback procedures
- Version tracking and audit logs
- Health checks after rollback

**Severity**: Medium

#### T7: Supply Chain Attack

**Description**: Compromised build pipeline injects malicious code

**Mitigation**:
- GitHub Actions from verified publishers
- Pinned action versions
- Artifact integrity checks
- Isolated build environments

**Severity**: High

#### T8: Secrets Leakage in Logs

**Description**: Sensitive data exposed in CI/CD logs

**Mitigation**:
- GitHub automatically masks secrets in logs
- No console.log of sensitive data
- Structured logging without PII
- Log sanitization

**Severity**: High

## Security Controls

### Authentication & Authorization

#### GitHub Actions

- **Repository Access**: Requires repository write access
- **Environment Protection**: Production requires manual approval
- **Branch Protection**: Main branch requires PR and reviews
- **Secrets Access**: Limited to specific workflows and environments

#### Deployment Permissions

```yaml
# Production environment protection (configure in GitHub)
environment:
  name: production
  protection_rules:
    - required_reviewers: 2
    - wait_timer: 5  # minutes
```

### Input Validation

#### Environment Configuration

All configuration inputs are validated:

```typescript
// Port validation
if (config.port < 1 || config.port > 65535) {
  errors.push(`Invalid port number: ${config.port}`);
}

// URL validation
if (!isValidUrl(config.apiBaseUrl)) {
  errors.push(`Invalid API base URL: ${config.apiBaseUrl}`);
}

// Production-specific validation
if (config.environment === 'production') {
  if (config.stellarNetwork !== 'mainnet') {
    errors.push('Production must use Stellar mainnet');
  }
}
```

#### Promotion Path Validation

Only valid promotion paths are allowed:

```typescript
const validPaths: Record<Environment, Environment[]> = {
  development: ['staging'],
  staging: ['production'],
  production: [], // Cannot promote from production
};
```

### Dependency Security

#### Automated Scanning

```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate
  continue-on-error: true

- name: Check for vulnerabilities
  run: |
    VULNS=$(npm audit --json | jq '.metadata.vulnerabilities.total')
    if [ "$VULNS" -gt 0 ]; then
      echo "::warning::Found $VULNS vulnerabilities"
    fi
```

#### Update Policy

- Security patches: Apply immediately
- Minor updates: Weekly review
- Major updates: Monthly review with testing

### Secrets Management

#### GitHub Secrets

Store sensitive data in GitHub Secrets:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  API_KEY: ${{ secrets.API_KEY }}
```

#### Environment Variables

Non-sensitive configuration via environment variables:

```yaml
env:
  NODE_ENV: production
  PORT: 3000
```

#### Never Commit

- API keys
- Database credentials
- Private keys
- Access tokens
- Passwords

### Network Security

#### CORS Configuration

Production requirements:
- No wildcard (`*`) origins
- No localhost origins
- HTTPS-only origins
- Explicit domain whitelist

```typescript
// Valid production CORS
corsOrigins: ['https://app.example.com', 'https://www.example.com']

// Invalid production CORS
corsOrigins: ['*']  // ❌ Wildcard
corsOrigins: ['http://localhost:3000']  // ❌ Localhost
```

#### API Security

- HTTPS required for production
- Rate limiting (implement as needed)
- Request size limits
- Input sanitization

## Security Testing

### Automated Tests

#### Unit Tests

- Configuration validation
- Input sanitization
- Error handling
- Edge cases

#### Integration Tests

- End-to-end deployment workflow
- Multi-environment scenarios
- Error recovery
- Rollback procedures

### Security Checklist

Before production deployment:

- [ ] All tests passing (95%+ coverage)
- [ ] No high/critical vulnerabilities in `npm audit`
- [ ] Environment configuration validated
- [ ] CORS origins reviewed
- [ ] Secrets properly configured
- [ ] Branch protection enabled
- [ ] Environment protection configured
- [ ] Monitoring and alerting active
- [ ] Rollback plan documented
- [ ] Team notified of deployment

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitoring alerts or manual discovery
2. **Assess**: Determine severity and impact
3. **Contain**: Rollback or disable affected component
4. **Investigate**: Root cause analysis
5. **Remediate**: Apply fix and test
6. **Document**: Post-mortem and lessons learned

### Rollback Procedure

```typescript
// Emergency rollback
const rollback = await rollbackDeployment({
  environment: 'production',
  targetVersion: 'v1.0.0',  // Last known good version
  reason: 'Security incident: [description]',
  initiatedBy: 'security-team',
});
```

### Communication

- Notify security team immediately
- Update status page if customer-facing
- Document timeline and actions
- Post-incident review within 48 hours

## Compliance

### Audit Logging

All deployment activities are logged:

- Timestamp
- Environment
- Version/commit
- Initiating user
- Success/failure status
- Validation results

### Data Protection

- No PII in logs or artifacts
- Secure credential storage
- Encrypted data in transit (HTTPS)
- Access controls on sensitive data

### Retention

- Build artifacts: 7 days
- Deployment logs: 90 days
- Security scan results: 1 year
- Audit logs: 2 years

## Security Contacts

### Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

Instead:
1. Email security team (configure your email)
2. Include detailed description
3. Provide steps to reproduce
4. Suggest fix if possible

### Security Team

- Primary: [Configure contact]
- Secondary: [Configure contact]
- Emergency: [Configure contact]

## Security Updates

### Staying Informed

- Subscribe to GitHub Security Advisories
- Monitor npm security bulletins
- Follow Node.js security releases
- Review Stellar/Soroban security updates

### Update Schedule

- **Critical**: Immediate (within 24 hours)
- **High**: Within 1 week
- **Medium**: Within 1 month
- **Low**: Next regular update cycle

## Best Practices

### Development

1. Never commit secrets
2. Use environment variables
3. Validate all inputs
4. Follow principle of least privilege
5. Keep dependencies updated

### Deployment

1. Always deploy to staging first
2. Run security scans before production
3. Validate configuration
4. Monitor post-deployment
5. Have rollback plan ready

### Operations

1. Regular security audits
2. Monitor for anomalies
3. Keep audit logs
4. Review access permissions
5. Update documentation

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [npm Security](https://docs.npmjs.com/about-security-audits)
