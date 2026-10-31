# QuickNotes System Architecture

## Requirements

### Functional requirements

- Users can create accounts and access only their own notes.
- Users can create, list, retrieve, update, and delete notes.
- Users can organize notes with tags.
- The notes list supports pagination and returns notes in a predictable order.
- The API validates input and returns documented success and error responses.

### Non-functional requirements

- **Availability:** target 99.9% monthly availability for note reads and writes.
- **Performance:** target p95 API latency below 300 ms for reads and 500 ms for writes, excluding client network time.
- **Scalability:** add stateless application instances and database read capacity as load grows.
- **Durability:** commit writes to durable storage before acknowledging success; use backups and point-in-time recovery.
- **Security:** use HTTPS, authenticate requests, authorize access per user, validate inputs, and encrypt stored data.
- **Consistency:** read-after-write requests should see the latest note; use the primary for these reads and accept replica lag only for eligible reads.
- **Observability:** collect request, error, latency, queue-lag, and database-health metrics and logs.

## Load estimate for 1 million users

These are planning estimates, not measured production traffic. Assume 1,000,000
registered users, 20% daily active users (200,000 DAU), 20 note reads per
active user per day, and 2 note writes per active user per day. Reads include
list and detail requests; writes include creates and updates. Assume a fivefold
peak-to-average traffic multiplier.

| Metric | Average estimate | Peak planning estimate |
| --- | ---: | ---: |
| Reads | 4,000,000/day = about 46 requests/second | about 230 requests/second |
| Writes | 400,000/day = about 4.6 requests/second | about 23 requests/second |

For storage, assume each newly written note consumes an average of 2 KB of
logical data and metadata. For a conservative growth bound, assume every
write creates a new note rather than updating an existing one: 400,000 notes
per day is about 146 million notes and 292 GB of logical note data per year.
Budgeting 2x for indexes and database overhead gives approximately **584 GB
per year** on the primary, excluding backups, replicas, user/tag rows, and any
retention or compaction. Updates, deletions, actual note sizes, and replica
copies change the physical capacity requirement; monitor real data and revise
the estimate.

## High-level architecture

```text
                         +----------------------+
                         |   DNS / health checks|
                         +----------+-----------+
                                    |
                                    v
+--------+  HTTPS  +----------------------+  +----------------------+
| Client | ------> | CDN (static assets)  |->| Load balancer (HA)   |
+--------+         +----------------------+  +----------+-----------+
                                                        |
                                      +-----------------+-----------------+
                                      |                                   |
                                      v                                   v
                              +---------------+                   +---------------+
                              | App server 1  |                   | App server 2  |
                              +-------+-------+                   +-------+-------+
                                      |                                   |
                                      +-----------------+-----------------+
                                                        |
                                  +---------------------+---------------------+
                                  |                     |                     |
                                  v                     v                     v
                          +---------------+     +---------------+     +---------------+
                          | Cache cluster |     | Primary DB    |     | Message queue |
                          | (HA)          |     | (HA)          |     | (replicated)  |
                          +-------+-------+     +-------+-------+     +-------+-------+
                                  ^                     |                     |
                                  |                     v                     v
                                  |              +---------------+     +---------------+
                                  +--------------| Read replica  |     | Worker pool   |
                                  cache refresh  +---------------+     +-------+-------+
                                                                            |
                                                                            +--> async
                                                                                 tasks /
                                                                                 cache
                                                                                 invalidation
```

### Components and the problems they solve

- **Client:** provides the user interface and sends authenticated API requests without needing direct database access.
- **DNS:** maps the service name to the edge entry point and health-aware routing avoids directing new traffic to an unhealthy endpoint.
- **CDN:** serves versioned static assets near users, reducing origin traffic and page-load latency.
- **Load balancer:** distributes API traffic across healthy application instances and provides a stable service endpoint.
- **App servers:** validate, authenticate, and authorize requests and apply QuickNotes business logic; at least two stateless instances prevent a single server from being a capacity or availability bottleneck.
- **Cache cluster:** reduces repeated reads to the database for frequently accessed note lists or details, with invalidation after writes.
- **Primary database:** provides the authoritative, transactional store for note and relationship writes.
- **Read replica:** serves eligible read-only queries to offload the primary while replication provides a separately scalable read path.
- **Message queue:** buffers asynchronous work so slow downstream processing does not hold up the user-facing request and transient worker outages do not lose queued jobs.
- **Worker pool:** processes queued tasks such as cache invalidation and non-critical follow-up work outside the request path.

## Request flows

### `GET /api/v1/notes`

1. The client resolves the service hostname through DNS and requests `/api/v1/notes` over HTTPS; static application assets may be served by the CDN.
2. The load balancer routes the API request to a healthy app server.
3. The app server authenticates the user, checks authorization, and validates pagination parameters.
4. The app server checks the cache using a key scoped to the user and query parameters.
5. On a cache hit, the app server returns the cached list. On a miss, it queries the read replica (or the primary when read-after-write consistency is required).
6. The app server caches the result for a short, bounded TTL and returns `200 OK` with the paginated JSON response.

### `GET /api/v1/notes/{noteId}`

1. The client sends an authenticated HTTPS request through the load balancer to a healthy app server.
2. The app server authenticates the user, validates the UUID, and scopes the lookup to the authenticated user.
3. It reads a user-scoped cached value when available; otherwise, it queries the database. If the read must reflect a recent write, it uses the primary.
4. The app server returns `200 OK` with the note, or `404 Not Found` when the note does not exist or is not visible to that user.

### `POST /api/v1/notes`

1. The client sends an authenticated HTTPS `POST /api/v1/notes` with a JSON title and body.
2. DNS and the load balancer direct the request to a healthy app server.
3. The app server authenticates the user, validates the title and body, and associates the new note with the authenticated user rather than trusting a client-supplied owner ID.
4. The app server inserts the note into the primary database in a transaction; the database enforces constraints and durably commits the write.
5. After commit, the app server publishes an event for asynchronous work (preferably through a transactional outbox so a committed note cannot lose its event). The worker later processes it and invalidates affected cache entries.
6. The app server returns `201 Created` with the new note. If the queue is temporarily unavailable, the outbox retains the event for retry and the committed note remains available.

### `PUT`, `PATCH`, and `DELETE /api/v1/notes/{noteId}`

1. The client sends an authenticated HTTPS request through the load balancer to a healthy app server.
2. The app server validates the identifier and request body, then scopes the operation to the authenticated user; ownership is never taken from client input.
3. For `PUT` or `PATCH`, it updates the note and `updated_at` in a database transaction. For `DELETE`, it deletes the note in a transaction; related tag associations are removed by foreign-key cascade.
4. The transaction commits to the primary database. The same transaction records an outbox event so cache invalidation can be retried if the queue or workers are temporarily unavailable.
5. The app server returns the updated note with `200 OK` for an update, or an empty `204 No Content` response for a delete. Missing or non-owned notes return `404 Not Found`.

## Trade-offs and resilience

- **Cache speed vs. freshness:** caching reduces database load and latency but can briefly serve stale data. Use short TTLs, user-scoped keys, and write-triggered invalidation; route read-after-write requests to the primary.
- **Read replicas vs. consistency:** replicas increase read capacity but replication lag can make recent changes temporarily invisible. Send strongly consistent reads to the primary and use replicas only for reads that tolerate bounded staleness.
- **Asynchronous queue vs. immediate completion:** queuing follow-up work keeps API latency predictable but means that work such as cache invalidation may be delayed. Make jobs idempotent, retry failures with backoff, monitor queue age, and use a dead-letter queue for jobs that exhaust retries.
- **Availability vs. strict synchronous dependencies:** the system can accept a durable note write even if non-critical workers are down, but eventually consistent side effects may be delayed until recovery. The transactional outbox prevents a committed write from silently losing its follow-up event.

### Single points of failure and recovery

The design avoids relying on one instance of stateless components: run at
least two app servers across availability zones, use a multi-zone load
balancer, and configure the cache and queue as replicated managed services.
Workers run as a replaceable pool. DNS uses redundant authoritative
infrastructure and health-aware routing. These choices reduce instance- and
zone-level single points of failure, but do not by themselves protect against
an entire provider or region outage.

The primary database is the critical stateful dependency and the main
residual single-point-of-failure risk. Use a synchronous HA standby with
automated failover to reduce data loss and service interruption, and maintain
independent backups with point-in-time recovery for corruption or operator
error. A read replica is not a substitute for a backup; it may replicate
accidental deletes or corrupt writes. Define and test recovery time and
recovery point objectives, failover behavior, restore procedures, and replica
promotion before production. A regional outage may still require a separately
planned cross-region recovery strategy.

Cache failure should bypass the cache, with rate limits and database capacity
planning to prevent the resulting load increase from overwhelming the
primary. Queue or worker outages delay asynchronous work but should not lose
committed writes because events remain in the transactional outbox. DNS,
certificate, identity-provider, secrets-management, and deployment-control
plane outages are additional operational dependencies; document fallback
procedures, monitor their health, and avoid treating backups or replicas as
automatic failover without regular recovery tests.