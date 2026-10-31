# QuickNotes Data Model

QuickNotes uses a relational PostgreSQL schema. UUIDs are used for entity
identifiers, and timestamps are stored with time zone information.

## Entities and columns

| Entity | Column | Type | Constraints |
| --- | --- | --- | --- |
| `users` | `id` | `UUID` | Primary key |
| `users` | `email` | `VARCHAR(320)` | Required, unique |
| `users` | `display_name` | `VARCHAR(100)` | Required |
| `users` | `created_at` | `TIMESTAMPTZ` | Required, defaults to current time |
| `notes` | `id` | `UUID` | Primary key |
| `notes` | `user_id` | `UUID` | Required, foreign key to `users.id` |
| `notes` | `title` | `VARCHAR(100)` | Required, must not be blank |
| `notes` | `body` | `TEXT` | Required, may be empty |
| `notes` | `created_at` | `TIMESTAMPTZ` | Required, defaults to current time |
| `notes` | `updated_at` | `TIMESTAMPTZ` | Required, defaults to current time |
| `tags` | `id` | `UUID` | Primary key |
| `tags` | `user_id` | `UUID` | Required, foreign key to `users.id` |
| `tags` | `name` | `VARCHAR(50)` | Required |
| `tags` | `created_at` | `TIMESTAMPTZ` | Required, defaults to current time |
| `note_tags` | `note_id` | `UUID` | Primary key component, foreign key to `notes.id` |
| `note_tags` | `tag_id` | `UUID` | Primary key component, foreign key to `tags.id` |
| `note_tags` | `created_at` | `TIMESTAMPTZ` | Required, defaults to current time |

The `note_tags` primary key is the composite (`note_id`, `tag_id`), which
prevents assigning the same tag to the same note more than once.

## Relationships

- **Users to notes (one-to-many):** one user can own many notes; each note
  belongs to exactly one user through `notes.user_id`.
- **Users to tags (one-to-many):** one user can define many tags; each tag
  belongs to exactly one user through `tags.user_id`.
- **Notes to tags (many-to-many):** a note can have many tags, and a tag can
  be applied to many notes. The `note_tags` junction table stores each
  association.

Foreign-key deletion behavior is explicit: deleting a user cascades to their
notes and tags; deleting a note or tag cascades to its association rows. The
schema does not automatically delete a tag when a note is deleted.

## PostgreSQL schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL CHECK (length(trim(title)) > 0),
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id)
);
```

## Indexes

```sql
CREATE INDEX notes_user_updated_at_idx
    ON notes (user_id, updated_at DESC);

CREATE INDEX note_tags_tag_id_idx
    ON note_tags (tag_id);
```

`notes_user_updated_at_idx` supports the common operation of listing one
user's notes by most recently updated. `note_tags_tag_id_idx` helps find notes
by tag; the composite primary key already supports lookups beginning with
`note_id`.

## Example queries

List a user's most recently updated notes:

```sql
SELECT id, title, body, created_at, updated_at
FROM notes
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT 10;
```

Find all notes associated with a tag (JOIN):

```sql
SELECT n.id, n.title, n.body
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = $1
  AND t.name = $2
ORDER BY n.updated_at DESC;
```

Create a tag association, doing nothing if it already exists:

```sql
INSERT INTO note_tags (note_id, tag_id)
VALUES ($1, $2)
ON CONFLICT (note_id, tag_id) DO NOTHING;
```

Count notes per user, including users with no notes:

```sql
SELECT u.id, u.display_name, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.display_name
ORDER BY u.display_name;
```

## SQL vs. NoSQL decision

Use PostgreSQL (SQL) as the system of record. Users, notes, and tags have
well-defined relationships, including a many-to-many relationship between
notes and tags. Foreign keys, unique constraints, and transactions enforce
ownership and association integrity, while joins support tag filtering and
cross-entity reporting.

A document or key-value database (NoSQL) could store note records, but
modeling shared tags would require embedding/duplicating tag data or adding
separate relationship management. That makes updates and consistency across
notes more complex without a clear benefit for the current access patterns.
The relational model is therefore the simpler, safer fit for this product.