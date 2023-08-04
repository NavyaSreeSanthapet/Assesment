//supertest to test API Endpoints by making http requests for testing.
//imported app main code.
const app = require('../app');
const request = require('supertest');
//imported my db code.
const db = require('../db');




describe('GET /signup', () => {
    it('should return status 200 and contain a welcome message', async () => {
        const res = await request(app).get('/signup');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Welcome to the signup page!');
    });
});

describe('POST /signup', () => {
    it('should successfully register a new user', async () => {
        const newUser = {
            username: 'testuser1',
            email: 'test@example.com',
            password: 'password123',
            role: 'user',
        };

        const res = await request(app).post('/signup').send(newUser);
        expect(res.status).toBe(201);
        expect(res.text).toContain('User registered successfully!');

    });

    it('should handle errors and return status 500 for invalid data', async () => {
        jest.spyOn(db, 'query').mockImplementation(() => {
            // Simulate a database error by throwing an error
            throw new Error('Database error');
        });
        const invalidUser = {
             username: 'testuser',
        };
        const res = await request(app).post('/signup').send(invalidUser);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error');
    });
});

describe('GET /login', () => {
    it('should return status 200 and contain a welcome message', async () => {
        const res = await request(app).get('/login');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Welcome to the Login page!');
    });
});

describe('POST /login',() => {

    it('should successfully log in a user with valid credentials', async () => {
        jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', password: 'testpassword' }] });
        const validUser = {
            email: "test@example.com",
            password: "testpassword",
        };

        const res = await request(app).post('/login').send(validUser);

        expect(res.status).toBe(200);
        expect(res.text).toContain('Login successful.');
        db.query.mockRestore();
    });

    it('should return status 401 for invalid credentials', async () => {

        jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', password: 'testpassword' }] });
        const invalidUser = {
            email: 'test@example.com',
            password: 'invalidpassword',
        };
        const res = await request(app).post('/login').send(invalidUser);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Invalid credentials.');
    });

    it('should return status 500 for database query error', async () => {
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const validUser = {
            email: 'sreenavya@gmail.com',
            password: 'sree',
        };

        const res = await request(app).post('/login').send(validUser);
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Database query error');

        db.query.mockRestore();
    });
});

describe('GET /books1/bookadd', () => {
    it('should return status 200 and render the bookadd view for admin users', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        const res = await agent.get('/books1/bookadd');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Add New Book');
    });

    it.skip('should return status 403 for non-admin users', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        const res = await agent.get('/books1/bookadd');
        expect(res.text).toContain('Please log in as admin to access this page');

    },1000000);
});

describe('POST /books', () => {
    it('should add a new book and redirect to /books route', async () => {
        const newBook = {
            title: 'Test Book2',
            authorname: 'Test Author2',
            author_id: 2,
            genre: 'Fiction',
            description: 'A test book description',
            ratings: 4.5,
        };
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        const res = await agent.post('/books').send(newBook).expect(302); // Expecting a redirect

        // Check if the book was added to the database
        const query = 'SELECT * FROM books WHERE title = $1';
        const { rows } = await db.query(query, [newBook.title]);
        expect(rows.length).toBe(1);
        expect(rows[0].title).toBe(newBook.title);

        // Check if the redirect location is correct
        expect(res.headers.location).toBe('/books');
    });

    it('should return status 500 and error message for database query error', async () => {
        // Mocking database query error
        jest.spyOn(db, 'query').mockRejectedValue(new Error('Database query error'));

        const newBook = {
            title: 'Test Book',
            authorname: 'Test Author',
            author_id: 1,
            genre: 'Fiction',
            description: 'A test book description',
            ratings: 4.5,
        };
        const res = await request(app).post('/books').send(newBook).expect(500);
        expect(res.text).toContain('Internal Server Error');
        // Restore the original pool.query function to avoid interference with other tests
        db.query.mockRestore();
    });
});

describe('GET /books/:id/edit', () => {
    it('should return status 200 and render the bookedit view for admin users', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        await agent.get('/books/1/edit').expect(200);
    });

    it('should return status 404 when the book is not found', async () => {
        // Mock the pool.query function to return an empty result for book with id 999

        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        jest.spyOn(db, 'query').mockResolvedValue({ rows: [] });
        const res = await agent.get('/books/999/edit');
        expect(res.status).toBe(404);
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        // Mock the pool.query function to throw an error
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const res = await agent.get('/books/1/edit');
        expect(res.status).toBe(500);
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });
});

describe('DELETE /books/:id', () => {
    it('should return status 302 and redirect to /books after successful deletion for admin users', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        // Mock the pool.query function to simulate a successful deletion
        jest.spyOn(db, 'query').mockResolvedValueOnce({});
        await agent.delete('/books/1').expect(302).expect('Location', '/books');
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const res = await agent.delete('/books/1');
        expect(res.status).toBe(500);
        db.query.mockRestore();
    });
});

describe('PUT /books/:id', () => {
    it('should update book details and return status 302 with redirect to book details page', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        jest.spyOn(db, 'query').mockResolvedValueOnce({});
        const bookId = 1;
        const updatedBookData = {
            title: 'Updated Book Title',
            author_id: 123,
            authorname: 'John Doe',
            genre: 'Fiction',
            description: 'An updated book description.',
            ratings: 4.5,
        };
        await agent.put(`/books/${bookId}`).send(updatedBookData).expect(302).expect('Location', `/books/${bookId}`);
        db.query.mockRestore();
    });
});

describe('GET /books/:id', () => {
    it('should return status 200 and render the bookdetails view with book details', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        jest.spyOn(db, 'query').mockResolvedValueOnce({
            rows: [{ id: 1, title: 'Sample Book', author: 'John Doe', genre: 'Fiction', description: 'A sample book description', ratings: 4.5 }],
        });
        const bookId = 1;
        const res = await agent.get(`/books/${bookId}`);
        expect(res.status).toBe(200);
        expect(res.text).toContain('Books Details');
        db.query.mockRestore();
    });

    it('should return status 404 when the book is not found', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] });
        const bookId = 999;
        const res = await agent.get(`/books/${bookId}`);

        expect(res.status).toBe(404);
        expect(res.text).toContain('Book not found');
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const bookId = 1;
        const res = await agent.get(`/books/${bookId}`);

        expect(res.status).toBe(500);
        db.query.mockRestore();
    });
});

describe('GET /authors', () => {
    it('should return status 200 and render the authors view with author data', async () => {
        const mockAuthorsData = [
            { id: 1, authorname: 'Author 1' },
            { id: 2, authorname: 'Author 2'},
        ];
        jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockAuthorsData });

        const agent = request.agent(app);
        const res = await agent.get('/authors');

        expect(res.status).toBe(200);
        expect(res.text).toContain('Author 1');
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });

        const agent = request.agent(app);
        const res = await agent.get('/authors');

        expect(res.status).toBe(500);
        db.query.mockRestore();
    });
});

describe('GET /authors/:authorname/books', () => {
    it('should return status 200 and render the authorbooks view with books by the specified author', async () => {
        const authorname = 'Author 1';
        const mockBooksData = [
            { id: 1, title: 'Book 1', authorname: 'Author 1', genre: 'Fiction', description: 'A sample book description', ratings: 4.5 },
            { id: 2, title: 'Book 2', authorname: 'Author 1', genre: 'Non-Fiction', description: 'Another book description', ratings: 3.8 },
        ];
        jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockBooksData });

        const agent = request.agent(app);
        const res = await agent.get(`/authors/${authorname}/books`);

        expect(res.status).toBe(200);
        expect(res.text).toContain('Book 1');
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const agent = request.agent(app);
        const authorname = 'Author 1';
        const res = await agent.get(`/authors/${authorname}/books`);
        expect(res.status).toBe(500);
        db.query.mockRestore();
    });
});

describe('GET /user', () => {
    it('should return status 200 and render the userprofile view with user data', async () => {
        const userId = 1;
        const mockUserData = {
            id: 1,
            username: 'Test User',
            email: 'test@example.com',
            role:'user'
        };
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        jest.spyOn(db, 'query').mockResolvedValueOnce({rows: [mockUserData]});
        const res = await agent.get('/user');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Test User');
        db.query.mockRestore();
    });
});

describe('PUT /user/:id', () => {
    it('should update user details and return status 302 with redirect to user profile page', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        jest.spyOn(db, 'query').mockResolvedValueOnce({});

        const userId = 1;
        const updatedUserData = {
            username: 'Updated User',
            email: 'updated@example.com',
            password: 'newpassword',
            role:'user'
        };
        await agent.put(`/user/${userId}`).send(updatedUserData).expect(302).expect('Location', '/user');
        db.query.mockRestore();
    });
});
describe('GET /search1', () => {
    it('should return status 200 and render the searchresults view with search query results', async () => {
        // Mock the pool.query function to simulate search results
        const searchQuery = 'fantasy';
        const mockBooks = [
            { id: 1, title: 'Fantasy Book 1', authorname: 'Author 1', genre: 'Fantasy', description: 'Description 1', ratings: 4.5 },
            { id: 2, title: 'Fantasy Book 2', authorname: 'Author 2', genre: 'Fantasy', description: 'Description 2', ratings: 4.0 },
        ];
        jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: mockBooks });
        const res = await request(app).get(`/search1?query=${searchQuery}`).expect(200);
        // Assert that the view is rendered with the search results and the correct message is displayed
        expect(res.text).toContain('Fantasy Book 1');
        expect(res.text).toContain('Fantasy Book 2');
        expect(res.text).not.toContain('No results found');
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });

    it('should return status 200 and render the searchresults view with No results found message', async () => {
        // Mock the pool.query function to simulate no search results
        const searchQuery = 'nonexistent';
        jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [] });
        const res = await request(app).get(`/search1?query=${searchQuery}`).expect(200);
        // Assert that the view is rendered with the "No results found" message
        expect(res.text).toContain('No results found');
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        // Mock the pool.query function to throw an error
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const searchQuery = 'error';
        const res = await request(app).get(`/search1?query=${searchQuery}`).expect(500);
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });
});

describe('Logout functionality', () => {
    test('Logout when user is logged in', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        const res= await agent.get(`/logout`);
        expect(res.status).toBe(200);
        expect(res.text).toContain('you have logged out');

    });
    test('Logout when user is not logged in', async () => {

        const res= await request(app).get(`/logout`);
        expect(res.status).toBe(200);
        expect(res.text).toContain('you have not logged in to logged out');
    });

});

describe('POST /author', () => {
    it('should successfully add a new author', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'test@example.com',
            password: 'password123',
        });
        // Define the data for the new author
        const newAuthor = {
            authorname: 'New Author',
        };
        // Mock the pool.query function to avoid database interactions and simulate successful insertion
        jest.spyOn(db, 'query').mockResolvedValueOnce();
        const res = await request(app).post('/author').send(newAuthor).expect(302);
        // Assert that the route redirects to the "/authors" route after successful insertion
        expect(res.header.location).toBe('/authors');
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        // Define the data for the new author
        const newAuthor = {
            authorname: 'New Author',
        };
        // Mock the pool.query function to throw an error
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const res = await request(app).post('/author').send(newAuthor).expect(500);
        // Restore the original pool.query function to avoid interfering with other tests
        db.query.mockRestore();
    });
});
describe('PUT /authors/:id', () => {
    it('should successfully update an existing author', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        const updatedAuthor = {
            authorname: 'Updated Author Name',
        };
        jest.spyOn(db, 'query').mockResolvedValueOnce();
        // Replace the ":id" placeholder with the actual author_id of the author you want to update
        const authorIdToUpdate = 1; // Replace this with the ID of the author you want to update
        const res = await request(app).put(`/authors/${authorIdToUpdate}`).send(updatedAuthor).expect(302);
        // Assert that the route redirects to the "/authors" route after successful update
        expect(res.header.location).toBe('/authors');
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        // Define the data for the updated author
        const updatedAuthor = {
            authorname: 'Updated Author Name',
        };
        // Mock the pool.query function to throw an error
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        const authorIdToUpdate = 1; // Replace this with the ID of the author you want to update
        const res = await request(app).put(`/authors/${authorIdToUpdate}`).send(updatedAuthor).expect(500);
        db.query.mockRestore();
    });
});

describe('DELETE /authors/:id', () => {
    it('should successfully delete an existing author', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });
        jest.spyOn(db, 'query').mockResolvedValueOnce();
        const authorIdToDelete = 1;
        const res = await agent.delete(`/authors/${authorIdToDelete}`).expect(302);
        expect(res.header.location).toBe('/authors');
        db.query.mockRestore();
    });

    it('should return status 500 for database query error', async () => {
        const agent = request.agent(app);
        await agent.post('/login').send({
            email: 'sreenavya@gmail.com',
            password: 'sree',
        });

        // Mock the pool.query function to throw an error
        jest.spyOn(db, 'query').mockImplementation(() => {
            throw new Error('Database query error');
        });
        // Replace the ":id" placeholder with the actual author_id of the author you want to delete
        const authorIdToDelete = 2; // Replace this with the ID of the author you want to delete
        const res = await agent.delete(`/authors/${authorIdToDelete}`).expect(500);
        db.query.mockRestore();
    });
});


