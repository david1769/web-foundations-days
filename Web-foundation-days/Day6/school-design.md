# School System Design

## Overview
A simple relational design for managing students, courses and enrolments in a school.

### Entities
- **Student** – a person enrolled at the school
- **Course** – a subject that can be taken by students
- **Enrolment** – the fact that a student is taking a particular course (includes an optional grade)

---

## Database Schema

### `students`
| Column | Type    | Constraints                  | Description              |
|--------|---------|------------------------------|--------------------------|
| id     | INTEGER | PRIMARY KEY                  | Unique student ID        |
| name   | TEXT    | NOT NULL                     | Full name                |
| email  | TEXT    | NOT NULL, UNIQUE             | Contact email            |

### `courses`
| Column | Type    | Constraints                  | Description              |
|--------|---------|------------------------------|--------------------------|
| id     | INTEGER | PRIMARY KEY                  | Unique course ID         |
| title  | TEXT    | NOT NULL                     | Course name              |
| code   | TEXT    | NOT NULL, UNIQUE             | Short course code        |

### `enrolments`
| Column     | Type    | Constraints                                      | Description                     |
|------------|---------|--------------------------------------------------|---------------------------------|
| id         | INTEGER | PRIMARY KEY                                      | Unique enrolment ID             |
| student_id | INTEGER | NOT NULL, FOREIGN KEY → students(id)             | Which student                   |
| course_id  | INTEGER | NOT NULL, FOREIGN KEY → courses(id)              | Which course                    |
| grade      | TEXT    |                                                  | Optional grade (A, B, C …)      |

**Additional rule:**  
`UNIQUE (student_id, course_id)` – a student cannot enrol on the same course more than once.

---

## Relationships
- One student can have many enrolments → **one-to-many**
- One course can have many enrolments → **one-to-many**
- Students and courses are linked through the enrolments table → **many-to-many**

---

## Example Data

**Students**
- Alice Johnson (alice@example.com)
- Bob Smith (bob@example.com)
- Carol Williams (carol@example.com)
- David Brown (david@example.com) – no enrolments

**Courses**
- Introduction to Databases (DB101)
- Web Development (WEB201)
- Data Structures (CS301)

**Enrolments**
- Alice → Databases (A), Web Development (B)
- Bob → Databases (B), Data Structures (not graded)
- Carol → Web Development (A)

---

## Useful Queries

1. **All courses for a student** (by name)
2. **All students on a course**
3. **Number of students per course**
4. **Students with no enrolments**
5. **Update a grade**

---

## Notes
- Primary keys are simple auto-incrementing integers.
- Foreign keys enforce referential integrity.
- The composite unique constraint on `(student_id, course_id)` prevents duplicate enrolments.
- `grade` is nullable so a student can be enrolled before receiving a final mark.