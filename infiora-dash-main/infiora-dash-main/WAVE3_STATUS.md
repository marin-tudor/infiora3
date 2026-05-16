# Wave 3 Status

`infiora-dash-main` is not part of the default active Infiora system.

Reason:

- still contains starter-template, fake-db, and demo search content
- uses a separate auth/runtime model from the authoritative admin stack

Rules:

- do not start it from root scripts
- do not deploy it by default
- if reactivated, update root docs and remove the fake-db/demo surface first
