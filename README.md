
1)Installation: 
Clone the repository to your local machine:
git clone https://github.com/your-username/library-management-app.git
Install the dependencies:
npm install

Database tables need to be created for the application.

CREATE TABLE issued_books (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  issue_date DATE NOT NULL,
  return_date DATE,
  noofbooks_toreturn INTEGER
);
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);

CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  authorname VARCHAR(255) NOT NULL
);

CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  authorname VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  description TEXT,
  ratings NUMERIC(3, 1),
  author_id INTEGER,
  quantity INTEGER SET DEFAULT 5
);
