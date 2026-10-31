# QuickNotes

QuickNotes is a small notes-app prototype and system-design project. The
browser app demonstrates loading, creating, and deleting notes. The documents
in `docs/` describe the backend API, relational data model, and production
architecture that the backend team should build.

## Run the prototype

From this directory, start a local static web server:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser.

The prototype currently sends requests to JSONPlaceholder. That service
simulates create and delete responses but does not persist those changes, so
the app's note list is temporary. The API described in `docs/api-design.md` is
the intended QuickNotes backend contract, not the JSONPlaceholder endpoint.

## Design documents

- [API design](docs/api-design.md) — endpoint contract, examples, validation,
  authentication, and error responses.
- [Data model](docs/data-model.md) — PostgreSQL entities, relationships,
  schema, indexes, queries, and SQL-versus-NoSQL decision.
- [Architecture](docs/architecture.md) — requirements, capacity estimates,
  architecture diagram, components, request flows, trade-offs, and resilience.
