# Wave 3 Status

`infiora-django-main` is an alternative Django backend, not the default authoritative API.

Rules:

- do not treat it as the production default without an explicit architecture decision
- do not wire root scripts or root docs to it by default
- if reactivated, harden its settings and document ownership before deployment
