# Wave 3 Status

`infiora-api-main` is an alternative .NET backend, not the default authoritative API.

Rules:

- do not treat it as the production default without an explicit architecture decision
- do not wire root scripts or root docs to it by default
- if reactivated, document its database, auth, deployment, and ownership alongside the Node backend decision
