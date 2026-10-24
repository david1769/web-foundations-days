# SnapShare: Photo App Scaling Plan

## 1. Overview

SnapShare is a photo-sharing application where users upload photos and scroll through a feed containing photos from people they follow.

This document proposes a scalable architecture that supports photo uploads, feed browsing, thumbnail generation, and efficient photo delivery as the number of users grows.

The design separates application logic, photo metadata, image files, and background processing to improve performance, availability, and scalability.

## 2. Assumptions

The following assumptions are used for the initial capacity estimates:

- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads one photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Average thumbnail size: 50 KB (0.05 MB).
- Every uploaded photo produces one thumbnail.
- One day contains 86,400 seconds.
- One year contains 365 days.
- Traffic is distributed across the day for average-rate calculations.
- Peak feed traffic is five times the average rate.
- Storage estimates use decimal units: 1 TB = 1,000,000 MB.
- Storage estimates exclude backups, replicas, temporary files, and storage overhead.
- Feed views refer to requests for feed pages, not individual image downloads.

## 3. Capacity Estimates

### 3.1 Daily Active Users

Daily active users are calculated as 10% of registered users.

DAU = Registered users × Daily active percentage

DAU = 10,000,000 × 0.10

**Daily active users = 1,000,000**

SnapShare must therefore support approximately one million active users per day.

### 3.2 Photo Uploads per Second

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1

**Daily uploads = 1,000,000 photos**

Average uploads per second:

Uploads/second = Daily uploads ÷ 86,400

Uploads/second = 1,000,000 ÷ 86,400

**Average upload rate ≈ 11.57 uploads/second**

If upload traffic experiences a fivefold peak:

Peak uploads/second = 11.57 × 5

**Estimated peak upload rate ≈ 57.87 uploads/second**

This is an average-based capacity estimate; real upload traffic may be burstier.

### 3.3 Feed Views per Second

Each active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50

**Daily feed views = 50,000,000 pages**

Average feed views per second:

Feed views/second = 50,000,000 ÷ 86,400

**Average feed rate ≈ 578.70 feed views/second**

Peak feed views per second:

Peak feed rate = 578.70 × 5

**Estimated peak feed rate ≈ 2,893.52 feed views/second**

The application should be designed to handle roughly 2,900 feed requests per second during peak periods, with additional capacity for bursts and image delivery.

### 3.4 Photo Storage per Year

Each photo consumes storage for the original image and its thumbnail.

Original photo = 2 MB

Thumbnail = 0.05 MB

Total storage per uploaded photo = 2 + 0.05

**Total = 2.05 MB per photo**

Daily original photo storage:

1,000,000 × 2 MB = 2,000,000 MB = 2 TB/day

Daily thumbnail storage:

1,000,000 × 0.05 MB = 50,000 MB = 0.05 TB/day

Total daily storage:

2 TB + 0.05 TB = **2.05 TB/day**

Annual storage:

2.05 TB × 365 = **748.25 TB/year**

| Storage category | Daily storage | Annual storage |
|---|---:|---:|
| Original photos | 2 TB | 730 TB |
| Thumbnails | 0.05 TB | 18.25 TB |
| **Total** | **2.05 TB** | **748.25 TB** |

This estimate assumes no photo deletions and a constant upload rate throughout the year. It excludes database records, backups, and replication.

## 4. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system**.

Each active user uploads one photo but views 50 feed pages daily. This gives the application approximately 50 feed-page requests for every photo upload.

The distinction matters because reading and writing place different demands on the infrastructure:

- Reads require fast retrieval of feed metadata and image files.
- Writes require reliable photo uploads, metadata persistence, and thumbnail generation.
- Popular images may be requested repeatedly by many users.
- Feed requests can generate substantial database and network traffic.

### Design implications

The architecture prioritizes read performance by using:

1. A CDN to deliver frequently requested photos and thumbnails close to users.
2. A cache to reduce repeated database queries for popular feed data.
3. A database read replica to distribute read traffic away from the primary database.
4. Multiple application servers behind a load balancer.
5. Object storage for durable, scalable image storage.

The primary database remains responsible for authoritative writes, such as recording new photo metadata.

## 5. Why Photos Should Not Be Stored Inside the Database

SnapShare should store photo files in **object storage**, such as Amazon S3, Azure Blob Storage, or Google Cloud Storage, rather than storing their binary contents directly in database rows.

Photo files are large, and storing them in a relational database would increase database size, backup time, storage costs, and the amount of data that must be managed during database maintenance.

Object storage is designed to store large files reliably and scale independently of the database. It can also integrate with a CDN to deliver images efficiently.

The database should store metadata and object references instead, including:

- Photo ID and owner ID.
- Object-storage key or path.
- Caption and upload timestamp.
- Thumbnail object key.
- Visibility and access-control information.

This separation allows SnapShare to scale image storage and database queries independently.

## 6. Architecture Diagram

```text
                         SNAPSHARE CLIENTS
                      (Web and Mobile Apps)
                                |
                                v
                       +------------------+
                       |       CDN        |
                       | Cached Images    |
                       +------------------+
                                |
                     Cache miss / API request
                                |
                                v
                       +------------------+
                       |  Load Balancer   |
                       +------------------+
                                |
                 +--------------+--------------+
                 |              |              |
                 v              v              v
          +------------+ +------------+ +------------+
          | App Server | | App Server | | App Server |
          |     A      | |     B      | |     C      |
          +------------+ +------------+ +------------+
                 |              |              |
                 +--------------+--------------+
                                |
                   +------------+------------+
                   |                         |
                   v                         v
           +---------------+          +---------------+
           | Cache         |          | Primary       |
           | (Redis)       |          | Database      |
           +---------------+          +---------------+
                                            |
                                            | Replication
                                            v
                                     +---------------+
                                     | Read Replica  |
                                     +---------------+

        PHOTO UPLOAD PATH
        ----------------

        App Servers
             |
             v
       +------------------+
       | Object Storage   |
       | Original Photos  |
       +------------------+
             |
             | Photo uploaded / job published
             v
       +------------------+
       | Message Queue    |
       +------------------+
             |
             v
       +------------------+
       | Thumbnail Worker |
       +------------------+
             |
             v
       +------------------+
       | Object Storage   |
       | Thumbnails       |
       +------------------+

        FEED IMAGE DELIVERY
        -------------------

        Client --> CDN --> Object Storage (cache miss)
```

The diagram is a logical architecture; in production, image uploads may use presigned object-storage URLs so clients can upload directly without routing large file contents through the application servers.

## 7. Component Responsibilities

1. **Client:** Allows users to upload photos, request feed pages, and display images.
2. **CDN:** Caches and serves frequently requested photos and thumbnails from edge locations, reducing latency and origin traffic.
3. **Load balancer:** Distributes incoming API requests across healthy application servers to avoid overloading individual instances.
4. **Application servers:** Handle authentication, upload authorization, feed generation, business rules, and metadata operations.
5. **Cache (Redis):** Stores frequently accessed feed data and other reusable results to reduce database load and improve response times.
6. **Primary database:** Stores authoritative photo metadata, user relationships, captions, and other transactional records.
7. **Read replica:** Handles suitable read queries to reduce the read workload on the primary database, while accepting that replication can introduce some delay.
8. **Object storage:** Stores original photos and thumbnails durably, with capacity that can grow independently of the database.
9. **Message queue:** Buffers thumbnail-generation jobs so uploads do not have to wait for image processing to finish.
10. **Thumbnail worker:** Consumes queued jobs, generates smaller image versions, stores them in object storage, and updates processing status when necessary.

## 8. Step-by-Step Photo Upload Flow

1. **User selects a photo.** The client validates basic file constraints, such as supported image format and maximum file size.

2. **Client requests authorization.** The client sends an upload request to the application server, which authenticates the user and checks upload permissions.

3. **An upload destination is created.** The application generates a unique photo ID and an object-storage key, and may issue a short-lived presigned upload URL.

4. **The original photo is uploaded.** The client uploads the image to object storage, preferably directly through the presigned URL to avoid sending large files through the application servers.

5. **The upload is verified.** The application or a trusted storage event handler verifies that the upload completed and checks relevant properties, such as file type, size, and integrity.

6. **Photo metadata is saved.** The primary database records the photo ID, owner, storage key, timestamp, visibility, and thumbnail-processing status.

7. **A thumbnail job is queued.** The application publishes a message containing the photo ID and original object key to the message queue.

8. **The upload response is returned.** Once the original photo and required metadata are safely recorded, the application confirms the upload; the thumbnail can still be processing.

9. **A worker processes the job.** A thumbnail worker retrieves the original photo, resizes it, compresses it, and generates the 50 KB thumbnail target where feasible.

10. **The thumbnail is stored.** The worker writes the thumbnail to object storage and updates the database with its object key and processing status.

11. **The feed becomes available.** Feed queries return the photo metadata and available image URLs; the client can show a placeholder until the thumbnail is ready.

12. **Images are delivered through the CDN.** When users view the photo, the CDN serves a cached image when available and retrieves it from object storage on a cache miss.

The queue should support retries and dead-letter handling so that temporary worker failures do not permanently lose thumbnail jobs. Processing should be idempotent, meaning retrying the same job does not create inconsistent results.

## 9. Trade-Offs

### Trade-off 1: Caching vs. Data Freshness

**Benefit:** Caching feed data and popular image references reduces database load and improves response times.

**Cost:** Cached feed data may become stale when a user uploads a photo, changes visibility, or unfollows another user.

**Decision:** Use short cache lifetimes where freshness matters, invalidate relevant entries when practical, and enforce access controls independently of cached content.

### Trade-off 2: Eventual Consistency vs. Immediate Availability

**Benefit:** Asynchronous thumbnail generation allows photo uploads to complete without waiting for image processing.

**Cost:** A newly uploaded photo may appear in the feed before its thumbnail is ready, and a read replica may temporarily return stale metadata.

**Decision:** Track thumbnail-processing status, display placeholders when needed, and send read-after-write requests to the primary database when immediate consistency is important.

### Trade-off 3: Object Storage vs. Database Simplicity

**Benefit:** Object storage scales efficiently for large image files and keeps the database focused on structured metadata.

**Cost:** The application must coordinate two systems, handle failed uploads, clean up orphaned objects, and manage permissions and lifecycle policies.

**Decision:** Use unique object keys, explicit upload states, retryable workflows, and periodic cleanup jobs to maintain consistency.

### Trade-off 4: CDN Caching vs. Privacy and Access Control

**Benefit:** CDN caching improves image delivery speed and reduces repeated requests to object storage.

**Cost:** Private photos require careful authorization and cache configuration; an incorrectly configured public cache could expose images.

**Decision:** Use public caching only for intentionally public content. For private images, use signed URLs or another authorization-aware delivery mechanism with appropriate cache lifetimes and invalidation rules.

## 10. Scaling Strategy

SnapShare should scale in stages:

- **Initial stage:** Deploy the application, primary database, object storage, and basic thumbnail queue with monitoring.
- **Growth stage:** Add multiple application servers, a load balancer, Redis caching, a read replica, and CDN delivery.
- **High-traffic stage:** Scale workers horizontally, tune database indexes, monitor queue depth, and partition or shard metadata only when a single database no longer meets performance requirements.
- **Reliability stage:** Add backups, cross-zone redundancy, lifecycle policies, monitoring, alerting, and tested recovery procedures.

Useful metrics include feed-request latency, upload success rate, database query latency, cache-hit ratio, CDN cache-hit ratio, queue depth, thumbnail-processing time, and storage growth.

## 11. Conclusion

SnapShare is expected to support **1 million daily active users**, approximately **11.57 photo uploads per second on average**, and **578.70 feed-page requests per second on average**, with peak feed traffic estimated at **2,893.52 requests per second**.

Original photos and thumbnails require approximately **748.25 TB of new storage per year** under the stated assumptions.

Because the system is read-heavy, the design emphasizes CDN delivery, caching, read replicas, and horizontal application scaling. Object storage keeps large photo files separate from structured database records, while a queue and thumbnail workers make image processing asynchronous and independently scalable.

This architecture provides a practical starting point for scaling SnapShare while preserving room to evolve as usage increases.
