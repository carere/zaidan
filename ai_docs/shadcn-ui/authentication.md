# Authentication

## Overview

The authentication page provides guidance on securing registries with authentication mechanisms. Authentication lets you run private registries, control who can access your components, and give different teams or users different content.

## Use Cases

The system supports several implementation scenarios:
- Protecting proprietary business logic through private components
- Providing team-specific resources with differentiated access
- Controlling visibility of sensitive or experimental features
- Tracking organizational component usage
- Managing licensed or premium component distribution

## Common Authentication Patterns

### Token-Based Authentication

The most common method uses Bearer tokens or API keys in HTTP headers. Configuration references environment variables like `${REGISTRY_TOKEN}` to avoid hardcoding secrets.

Example configuration:
```
Authorization: Bearer ${REGISTRY_TOKEN}
```

### API Key Authentication

Alternative headers like `X-API-Key` and `X-Workspace-Id` allow multiple authentication parameters for complex authorization scenarios.

Example:
```
X-API-Key: your_api_key
X-Workspace-Id: workspace_id
```

### Query Parameter Authentication

Simpler implementations pass tokens via URL parameters, generating URLs like:
```
https://registry.company.com/button.json?token=your_token
```

## Server-Side Implementation

The documentation provides Next.js and Express.js implementations showing how to:
- Extract tokens from headers or query parameters
- Validate token authenticity
- Implement role-based access control
- Return appropriate HTTP status codes

### Status Codes

- `401` - Invalid credentials/Unauthorized
- `403` - Insufficient permissions/Forbidden
- `429` - Rate limit exceeded

## Advanced Patterns

### Team-Based Access

Routes requests through team identification to serve role-specific components.

### User Personalization

Delivers customized component versions based on individual user preferences and settings.

### Temporary Access Tokens

Implements expiring credentials with scope limitations for enhanced security.

## Multi-Registry Authentication

Multiple registries can operate simultaneously with different authentication schemes, allowing organizations to mix public and private registries while organizing components by access tier.

## Security Best Practices

Critical practices include:

- **Environment Variables**: Store tokens exclusively in environment variables, never in version control
- **HTTPS Only**: Enforce HTTPS for all registry URLs
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **Token Rotation**: Rotate credentials regularly with expiration dates
- **Access Logging**: Maintain access logs for audit trails

## Error Handling

The system supports custom error messages returned with HTTP responses, allowing registries to provide context-specific guidance to users about subscription status or token renewal procedures.

## Multi-Registry Setup

The authentication system allows for advanced patterns through namespaced registries. Refer to the Namespaced Registries documentation for additional implementation details and multi-registry setup strategies.
