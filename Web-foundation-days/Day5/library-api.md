# Library Books REST API

Base URL: `/api/v1`

## Endpoints

### 1. List all books
- **Method:** `GET`
- **Path:** `/books`
- **Description:** Returns a list of all books in the library.
- **Success status code:** `200 OK`

### 2. Get a single book
- **Method:** `GET`
- **Path:** `/books/{id}`
- **Description:** Retrieves the details of a specific book by its ID.
- **Success status code:** `200 OK`

### 3. Create a new book
- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**
  ```json
  {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "isbn": "978-0743273565",
    "publishedYear": 1925,
    "available": true
  }