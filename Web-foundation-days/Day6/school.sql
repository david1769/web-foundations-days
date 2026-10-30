-- =============================================
-- 1 & 2. CREATE TABLE statements
-- =============================================

CREATE TABLE students (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    email   TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    id      INTEGER PRIMARY KEY,
    title   TEXT NOT NULL,
    code    TEXT NOT NULL UNIQUE
);

CREATE TABLE enrolments (
    id          INTEGER PRIMARY KEY,
    student_id  INTEGER NOT NULL,
    course_id   INTEGER NOT NULL,
    grade       TEXT,                     -- e.g. 'A', 'B', 'C' or NULL if not yet graded
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id)  REFERENCES courses(id),
    UNIQUE (student_id, course_id)        -- prevents the same student enrolling twice on the same course
);

-- =============================================
-- 3. INSERT sample data
-- =============================================

INSERT INTO students (id, name, email) VALUES
(1, 'Alice Johnson',  'alice@example.com'),
(2, 'Bob Smith',      'bob@example.com'),
(3, 'Carol Williams', 'carol@example.com'),
(4, 'David Brown',    'david@example.com');   -- will have no enrolments

INSERT INTO courses (id, title, code) VALUES
(1, 'Introduction to Databases', 'DB101'),
(2, 'Web Development',           'WEB201'),
(3, 'Data Structures',           'CS301');

INSERT INTO enrolments (id, student_id, course_id, grade) VALUES
(1, 1, 1, 'A'),   -- Alice → Databases
(2, 1, 2, 'B'),   -- Alice → Web Dev
(3, 2, 1, 'B'),   -- Bob   → Databases
(4, 2, 3, NULL),  -- Bob   → Data Structures (not graded yet)
(5, 3, 2, 'A');   -- Carol → Web Dev

-- =============================================
-- 4. The five required queries
-- =============================================

-- 1. All courses for one student (by name) – Alice
SELECT c.title, c.code, e.grade
FROM enrolments e
JOIN students s ON e.student_id = s.id
JOIN courses  c ON e.course_id  = c.id
WHERE s.name = 'Alice Johnson';

-- 2. All students on one course – Introduction to Databases
SELECT s.name, s.email, e.grade
FROM enrolments e
JOIN students s ON e.student_id = s.id
JOIN courses  c ON e.course_id  = c.id
WHERE c.title = 'Introduction to Databases';

-- 3. Number of students per course
SELECT c.title, COUNT(e.student_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON c.id = e.course_id
GROUP BY c.id, c.title
ORDER BY student_count DESC;

-- 4. Students who have no enrolments
SELECT s.name, s.email
FROM students s
LEFT JOIN enrolments e ON s.id = e.student_id
WHERE e.id IS NULL;

-- 5. Update one enrolment's grade
-- Give Bob a grade of 'C' for Data Structures
UPDATE enrolments
SET grade = 'C'
WHERE student_id = 2 AND course_id = 3;
git
-- Verify the update
SELECT s.name, c.title, e.grade
FROM enrolments e
JOIN students s ON e.student_id = s.id
JOIN courses  c ON e.course_id  = c.id
WHERE s.name = 'Bob Smith' AND c.title = 'Data Structures';