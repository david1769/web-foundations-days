# QuickNotes API Design

This document defines the REST API the QuickNotes backend should implement.
It is the service contract, not the JSONPlaceholder API used by the current
front-end prototype.

## Conventions

- Base path: `/api/v1`
- Request and response bodies use JSON and UTF-8.
- All endpoints require an authenticated user. The server derives note
  ownership from the authenticated principal; clients must not send an owner
  ID or access another user's notes.
- Note IDs are UUIDs. The server generates IDs and timestamps.
- A note has a required title containing 1-100 non-whitespace characters and
  a body that may be empty. If omitted on creation, the body defaults to `""`.
- Timestamps are ISO 8601 UTC strings.

## Endpoints

| Method | Path | Description | Success status |
| --- | --- | --- | --- |
| `GET` | `/api/v1/notes` | List the authenticated user's notes. Supports `limit` (default 10, maximum 100) and `offset` (default 0). Results are ordered by `updatedAt` descending. | `200 OK` |
| `POST` | `/api/v1/notes` | Create a note for the authenticated user. | `201 Created` |
| `GET` | `/api/v1/notes/{noteId}` | Retrieve one of the authenticated user's notes. | `200 OK` |
| `PUT` | `/api/v1/notes/{noteId}` | Replace a note's title and body. Both fields are required. | `200 OK` |
| `PATCH` | `/api/v1/notes/{noteId}` | Update the supplied title and/or body fields. | `200 OK` |
| `DELETE` | `/api/v1/notes/{noteId}` | Delete one of the authenticated user's notes. | `204 No Content` |

`noteId` is the UUID returned by the API. A missing note returns `404 Not
Found`. An unsupported method returns `405 Method Not Allowed`; an unknown
path returns `404 Not Found`.

## Note representation

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Plan the weekend",
  "body": "Pick a hiking trail and check the forecast.",
  "createdAt": "2026-10-30T13:45:00Z",
  "updatedAt": "2026-10-30T13:45:00Z"
}
```

The `userId` is intentionally not exposed in the note representation. The
backend associates each note with the authenticated user.

## Create a note

Request:

```http
POST /api/v1/notes
Content-Type: application/json
Accept: application/json
```

```json
{
  "title": "Plan the weekend",
  "body": "Pick a hiking trail and check the forecast."
}
```

`body` is optional and defaults to an empty string. The client must not
provide `id`, timestamps, or an owner ID.

Successful response: `201 Created`

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/v1/notes/550e8400-e29b-41d4-a716-446655440000
```

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Plan the weekend",
  "body": "Pick a hiking trail and check the forecast.",
  "createdAt": "2026-10-30T13:45:00Z",
  "updatedAt": "2026-10-30T13:45:00Z"
}
```

## List notes

Request:

```http
GET /api/v1/notes?limit=10&offset=0
Accept: application/json
```

Successful response: `200 OK`

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Plan the weekend",
      "body": "Pick a hiking trail and check the forecast.",
      "createdAt": "2026-10-30T13:45:00Z",
      "updatedAt": "2026-10-30T13:45:00Z"
    }
  ],
  "limit": 10,
  "offset": 0,
  "total": 1
}
```

`items` is always an array. When the user has no notes, it is empty and
`total` is `0`. `total` is the count of that user's matching notes.
`limit` must be between 1 and 100; `offset` must be a non-negative integer.

## Retrieve a note

Request:

```http
GET /api/v1/notes/550e8400-e29b-41d4-a716-446655440000
Accept: application/json
```

Successful response: `200 OK`, with the note representation shown above. A
note that does not exist or belongs to another user returns `404 Not Found`.

## Replace a note

`PUT` replaces both editable fields. Both `title` and `body` are required;
`body` may be an empty string.

Request:

```http
PUT /api/v1/notes/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Accept: application/json
```

```json
{
  "title": "Weekend plan",
  "body": ""
}
```

Successful response: `200 OK`, with the complete updated note. The server
updates `updatedAt` and leaves `id` and `createdAt` unchanged.

## Partially update a note

`PATCH` updates one or both editable fields. Omitted fields remain unchanged;
an empty request object is invalid.

Request:

```http
PATCH /api/v1/notes/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
Accept: application/json
```

```json
{
  "title": "Weekend plan"
}
```

Successful response: `200 OK`, with the complete updated note. The server
updates `updatedAt` and leaves `id` and `createdAt` unchanged.

## Delete a note

Request:

```http
DELETE /api/v1/notes/550e8400-e29b-41d4-a716-446655440000
```

Successful response: `204 No Content` with an empty response body. Deleting a
note belonging to another user has the same `404 Not Found` response as a
missing note.

## Error responses

Errors use a consistent JSON envelope. `code` is a stable machine-readable
value; `message` is safe to show to the caller.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 100 characters or fewer."
  }
}
```

| Status | Error code | Meaning |
| --- | --- | --- |
| `400 Bad Request` | `VALIDATION_ERROR` | The JSON is malformed or input validation fails, such as a missing, blank, or overlong title, invalid pagination, or an empty PATCH body. |
| `401 Unauthorized` | `UNAUTHENTICATED` | Authentication is missing or invalid. |
| `403 Forbidden` | `FORBIDDEN` | The authenticated user is not allowed to perform the requested operation. |
| `404 Not Found` | `NOTE_NOT_FOUND` or `ROUTE_NOT_FOUND` | The note does not exist or is not visible to this user, or the requested path is unknown. |
| `405 Method Not Allowed` | `METHOD_NOT_ALLOWED` | The path exists but does not support the requested method. |
| `500 Internal Server Error` | `INTERNAL_ERROR` | An unexpected server error occurred. |

The same error envelope is returned for each error status. Internal errors
must not expose stack traces, database details, or other implementation
details.
