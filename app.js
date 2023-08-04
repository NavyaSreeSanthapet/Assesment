const express = require('express');
const app = express();
const pool=require('./db');
const session = require("express-session");
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const port = 8080;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

//Initialized var booksPerPage for pagination
const booksPerPage = 10;

app.set("view engine", "pug");
app.set("views","./views");
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: "your_secret_key",
        resave: false,
        saveUninitialized: false,
    })
);

//middileware function of admin authorization and redirects to /books.
function authenticateadmin(req, res, next) {
    if (req.session.user) {
        if(req.session.user.role =='admin') {
            // User is authenticated, proceed to the next middleware or route handler
            next();
        }
    } else {
        // User is not authenticated, redirect to the login page or show an error page
        res.send('<script>alert("Please log in as admin to access this page."); window.location.href="/books";</script>');
    }
}

//middleware for admin authorization and redirect to /authors.
function authenticateadmin1(req, res, next) {
    if (req.session.user) {
        if(req.session.user.role =='admin') {
            // User is authenticated, proceed to the next middleware or route handler
            next();
        }
    } else {
        // User is not authenticated, redirect to the login page or show an error page
        res.send('<script>alert("Please log in as admin to access this page."); window.location.href="/authors";</script>');
    }
}

//middleware to authorize loggedin users and redirects to home page.
function authenticateUser(req, res, next) {
    if (req.session.user) {
        // User is authenticated, proceed to the next middleware or route handler
        next();
    } else {
        // User is not authenticated, redirect to the login page or show an error page
        res.send('<script>alert("Please log in as user to access this page."); window.location.href="/";</script>');

    }
}
//middleware to authorize loggedin users and redirects to /books page.
function authenticateUserbooks(req, res, next) {
    if (req.session.user) {
        // User is authenticated, proceed to the next middleware or route handler
        next();
    } else {
        // User is not authenticated, redirect to the login page or show an error page
        res.send('<script>alert("Please log in to access this page."); window.location.href="/books";</script>');
        // Change "/login" to the actual URL of your login page
    }
}

//get method at route '/' and  for featured books functionality.

app.get('/', async (req, res) => {
    //renders login pug page
    try {
        // Query the database to get 4 or 5 featured books including their image URLs
        const query = 'SELECT * FROM books ORDER BY ratings DESC LIMIT 5'; // Change the query to select the featured books based on your criteria
        const result = await pool.query(query);

        // Render the "homepage" template with the list of featured books
        res.render('index', { featuredBooks: result.rows });
    } catch (err) {
        console.error('Error retrieving featured books:', err);
        res.status(500).send('Internal Server Error');
    }
});

//get method for '/signup' route to render signup page.

app.get('/signup', async (req, res) => {
    const message = "Welcome to the signup page!";
    //renders login pug page
    res.render("signup",{ message });
});

//post method for '/signup' route to create users into users table.

app.post('/signup', async (req, res) => {
    try {
        //the username ,password and role values are sent through the request and stored in below variables.
        const username = req.body.username;
        const email=req.body.email;
        const password =req.body.password;
        const role=req.body.role;
        //logged to see weather server received correct values.
        console.log('Received data:', {username,email, password, role});
        //query to insert the given user values into database using below command.
        const query = 'INSERT INTO users (username,email,password,role) VALUES ($1, $2, $3, $4)';
        await pool.query(query, [username,email,password,role]);
        //once the database query is successfull sent a success message in response.
        const message = "User registered successfully!";
        //once user is registered successfully displays register page created.
        res.status(201).render("registered",{message});
    }//if any error occurs will send the error message in response.
    catch (err) {
        res.status(500).json({error: err.message});
    }
});

//get method for '/signup' route to render login page.

app.get('/login', async (req, res) => {
    const message = "Welcome to the Login page!";
    //renders login pug page
    res.status(200).render("login",{ message });
});

//post method for '/login' route for authentication.

app.post('/login', async (req, res) => {
    try {
        //the username ,password values sent through request are stored in below variables.
        const { email, password } = req.body;
        //query to select users with given id.
        const query = 'SELECT * FROM users WHERE email = $1';
        //below query selects the users from database with request id.
        const { rows } = await pool.query(query, [email]);
        //then if result of database query is null then returns invalid credentials message in response.
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = rows[0];
        //compared the result password with given password if both doesn't match send a message in response as 'Invalid credentials.'
        if (user.password!=password) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        //once user is Authenticated assigns user details to req.session.use object and send login2 page in response.
        req.session.user = user;
        req.session.user.id=user.id;
        req.session.user.role=user.role;
        res.status(200).render('login1',{ message: "Login successful." });
        //sends the token in response.
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//get method at '/books' to display books in books page.

app.get('/books', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get the current page from the query parameters or set it to 1 if not provided
        const offset = (page - 1) * booksPerPage; // Calculate the offset for pagination

        // Query the database to get a page of books based on the pagination
        const query = 'SELECT * FROM books ORDER BY title OFFSET $1 LIMIT $2';
        const values = [offset, booksPerPage];
        const result = await pool.query(query, values);

        // Get the total count of books for calculating the total number of pages
        const totalCountQuery = 'SELECT COUNT(*) FROM books';
        const totalCountResult = await pool.query(totalCountQuery);
        const totalBooks = parseInt(totalCountResult.rows[0].count);

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalBooks / booksPerPage);

        // Render the "books" template with the list of books and pagination information
        res.render('books', {
            books: result.rows,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (err) {
        console.error('Error retrieving books:', err);
        res.status(500).send('Internal Server Error');
    }
});
//get method at /books/:id/edit to render bookedit to edit book details and access to admins only.

app.get('/books/:id/edit',authenticateadmin, async (req, res) => {
    const bookId = req.params.id;

    try {
        // Fetch the book details based on the bookId from the "books" table using a SQL query
        const query = 'SELECT * FROM books WHERE id = $1';
        const values = [bookId];
        const result = await pool.query(query, values);
        // Check if a book with the specified bookId exists
        if (result.rows.length === 0) {
            return res.status(404).send('Book not found');
        }

        // Pass the book details to the Pug template
        const book = result.rows[0];
        console.log(book.author_id);

        res.render('bookedit', { book }); // Assuming your Pug file for book details is named "book-details.pug"
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

//delete method for /books/:id  to delete books and access to admins only.
app.delete('/books/:id', authenticateadmin, async (req, res) => {
    const bookId = req.params.id;

    try {
        // Update the book details in the "books" table using a SQL query
        const query = 'DELETE FROM books WHERE id = $1';
        const values = [bookId];
        const result = await pool.query(query, values);

        // Redirect to the book details page after successful update
        res.status(200).redirect(`/books`);
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

//get method at '/books/:id' to display details of a book in a page .

app.get('/books/:id', async (req, res) => {
    const bookId = req.params.id;

    try {
        // Fetch the book details based on the bookId from the "books" table using a SQL query
        const query = 'SELECT * FROM books WHERE id = $1';
        const values = [bookId];
        const result = await pool.query(query, values);
        // Check if a book with the specified bookId exists
        if (result.rows.length === 0) {
            return res.status(404).send('Book not found');
        }

        // Pass the book details to the Pug template
        const book = result.rows[0];
        console.log(book.title);
        res.status(200).render('bookdetails', { book }); // Assuming your Pug file for book details is named "book-details.pug"
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

//put method to update book details.

app.put('/books/:id', async (req, res) => {
    const bookId = req.params.id;
    const { title, author_id, authorname, genre, description, ratings } = req.body;

    try {
        // Update the book details in the "books" table using a SQL query
        const query = 'UPDATE books SET title = $1, author_id = $2,authorname=$3, genre = $4, description = $5, ratings = $6 WHERE id = $7';
        const values = [title, author_id,authorname, genre, description, ratings, bookId];
        await pool.query(query, values);

        // Redirect to the book details page after successful update
        res.redirect(`/books/${bookId}`);
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

//get method to render bookadd to add new book with access to admin only.
app.get('/books1/bookadd',authenticateadmin,async (req, res) => {
    try {
        // Your code to render the addbook view here
        res.status(200).render('bookadd');
    } catch (err) {
        console.error('Error rendering addbook:', err);
        res.status(500).send('Internal Server Error');
    }
});

//post method to add new book into to books table.

app.post('/books', async (req, res) => {
    try {
        const { title, authorname, author_id,genre, description, ratings} = req.body;


        const query =
            'INSERT INTO books (title, authorname,author_id, genre, description, ratings) VALUES ($1, $2, $3, $4, $5,$6)';
        const values = [title,authorname, author_id, genre, description, ratings];
        await pool.query(query, values);
        // Redirect to the "/books" route after successfully adding the book
        res.status(302).redirect('/books');
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).send('Internal Server Error');
    }
});

//get method or search page.

app.get('/search', (req, res) => {
        res.render('search');

});
//get method to display search results.
app.get('/search1', async (req, res) => {

    try {
        const searchQuery = req.query.query; // Extract the search query from the query parameters
        const page = parseInt(req.query.page) || 1; // Get the current page from the query parameters or set it to 1 if not provided
        const offset = (page - 1) * booksPerPage; // Calculate the offset for pagination

        // Perform the search query in the database based on the search term and pagination
        const query = 'SELECT * FROM books WHERE title ILIKE $1 OR authorname ILIKE $1 OR genre ILIKE $1 ORDER BY title OFFSET $2 LIMIT $3';
        const values = [`%${searchQuery}%`, offset, booksPerPage];
        const result = await pool.query(query, values);

        // Get the total count of books for calculating the total number of pages
        const totalCountQuery = 'SELECT COUNT(*) FROM books WHERE title ILIKE $1 OR authorname ILIKE $1 OR genre ILIKE $1';
        const totalCountValues = [`%${searchQuery}%`];
        const totalCountResult = await pool.query(totalCountQuery, totalCountValues);
        const totalBooks = parseInt(totalCountResult.rows[0].count);

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalBooks / booksPerPage);

        if (result.rows.length === 0) {
            res.status(200).render('searchresults', { books: result.rows, message: 'No results found' });
        } else {
            res.status(200).render('searchresults', {
                books: result.rows,
                message: '',
                currentPage: page,
                totalPages: totalPages,
                query: searchQuery,
            });
        }
    } catch (err) {
        console.error('Error searching for books:', err);
        res.status(500).send('Internal Server Error');
    }

});

//get method to render authors page.
app.get('/authors', async (req, res) => {
    try {
        // Fetch data from the "authors" table using a SQL query
        const result = await pool.query('SELECT * FROM authors');

        // Pass the retrieved data to the Pug template
        res.status(200).render('authors', { authors: result.rows }); // Assuming your Pug file is named "index.pug"
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

//get method at '/authors/:authorname/books' to display books by the author.

app.get('/authors/:authorname/books', async (req, res) => {
    const authorname = req.params.authorname;

    try {
        // Query the database for books written by the specified author
        const query = 'SELECT * FROM books WHERE authorname = $1';
        const values = [authorname];
        const result = await pool.query(query, values);
        res.render('authorbooks', { books: result.rows, authorname });
    } catch (err) {
        console.error('Error retrieving books by author:', err);
        res.status(500).send('Internal Server Error');
    }
});


//get method to render userprofile page to view user details.

app.get('/user', authenticateUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const query = 'SELECT * FROM users WHERE id = $1';
        const values = [userId];
        const result = await pool.query(query, values);

        // Render the "userprofile" template with the user's profile data
        res.status(200).render('userprofile', { user: result.rows[0] });
    } catch (err) {
        console.error('Error retrieving user profile:', err);
        res.status(500).send('Internal Server Error');
    }
});

//get method to edit user profile details.
app.get('/user/:id/edit',async (req, res) => {
    const userid = req.params.id;

    try {
        // Fetch the book details based on the bookId from the "books" table using a SQL query
        const query = 'SELECT * FROM users WHERE id = $1';
        const values = [userid];
        const result = await pool.query(query, values);

        const user = result.rows[0];
        console.log(user.id);

        res.render('useredit', { user }); // Assuming your Pug file for book details is named "book-details.pug"
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

//put method to update user details.
app.put('/user/:id', async (req, res) => {
    const userid = req.params.id;
    const { username, email, password } = req.body;

    try {
        // Update the user details in the "users" table using a SQL query
        const query = 'UPDATE users SET username = $1, email = $2, password = $3 WHERE id = $4';
        const values = [username, email, password, userid];
        await pool.query(query, values);

        // Redirect to the book details page after successful update
        res.redirect(`/user`);
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});
//get method for logout functionality.
app.get('/logout', (req, res) => {
    if(req.session.user)
    {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        }
        //after that redirects to login page.
        res.status(200).send('<script>alert("you have logged out"); window.location.href="/";</script>');
    });}
    else
        {
            res.send('<script>alert("you have not logged in to logged out"); window.location.href="/";</script>');
        }


});

//get method to add new author.
app.get('/authors/addauthor',authenticateadmin1,async (req, res) => {
    try {
        // Your code to render the addbook view here
        res.render('addauthor');
    } catch (err) {
        console.error('Error rendering addbook:', err);
        res.status(500).send('Internal Server Error');
    }
});

//post method to create new author.

app.post('/author', async (req, res) => {
    try {
        const {authorname} = req.body;

        const query =
            'INSERT INTO authors (authorname) VALUES ($1)';
        const values = [authorname];
        await pool.query(query, values);

        // Redirect to the "/books" route after successfully adding the book
        res.redirect('/authors');
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).send('Internal Server Error');
    }
});

//get method to edit author details with access to admins only.
app.get('/authors/:id/edit',authenticateadmin1, async (req, res) => {
    try {
        const author_id = req.params.id;

        const query = 'select * from authors where id=$1';
        const values = [author_id];
        const result= await pool.query(query, values);

        // Redirect to the "/books" route after successfully adding the book
        res.render('editauthor',{ author: result.rows[0] });
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).send('Internal Server Error');
    }
});
//put method for update authors details.
app.put('/authors/:id', async (req, res) => {
    const author_id = req.params.id;
    const { authorname } = req.body;

    try {
        // Update the user details in the "users" table using a SQL query
        const query = 'UPDATE authors SET authorname = $1 WHERE id = $2';
        const values = [authorname,author_id];
        await pool.query(query, values);
        // Redirect to the book details page after successful update
        res.redirect(`/authors`);
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
});

//delete method to delete author with access to admin only.
app.delete('/authors/:id',authenticateadmin1, async (req, res) => {
    const author_id = req.params.id;

    try {
        // Update the book details in the "books" table using a SQL query
        const query = 'DELETE FROM authors WHERE id = $1';
        const values = [author_id];
        const result = await pool.query(query, values);

        // Redirect to the book details page after successful update
        res.redirect(`/authors`);
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).send('Internal Server Error');
    }
})
//get method to issue books to users .
app.get('/books/:id/issue',authenticateUserbooks, async (req, res) => {
    try {
        const book_id = req.params.id;

        const query = 'select * from books where id=$1';
        const values = [book_id];
        const result= await pool.query(query, values);

        // Redirect to the "/books" route after successfully adding the book
        res.render('issuebook',{ book: result.rows[0] });
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).send('Internal Server Error');
    }
});
//post method to issue a book by user according to availability.
app.post('/books/:id/issue', async (req, res) => {
        const book_id = req.params.id;
        const quantityToIssue = parseInt(req.body.Noissue);
        const user_id= parseInt(req.session.user.id);// Convert the quantity to an integer

        try {
            // Fetch the book details from the database
            const queryGetBook = 'SELECT * FROM books WHERE id = $1';
            const bookResult = await pool.query(queryGetBook, [book_id]);
            const book = bookResult.rows[0];

            // Check if the requested quantity to issue is available
            if (quantityToIssue > book.quantity) {
                return res.status(400).send('Requested quantity exceeds available quantity.');
            }

            // Update the book's quantity in the database
            const updatedQuantity = book.quantity - quantityToIssue;
            const queryUpdateQuantity = 'UPDATE books SET quantity = $1 WHERE id = $2';
            await pool.query(queryUpdateQuantity, [updatedQuantity, book_id]);

            const query1='SELECT * FROM issued_books WHERE user_id=$1 and book_id=$2';
            const values1=[user_id,book_id];
            const result1=await pool.query(query1,values1);
            const currentDate = new Date().toISOString().split('T')[0];

            if(result1.rows.length===0)
            {
                 // Get the current date in YYYY-MM-DD format
                const queryInsertIssuedBook = 'INSERT INTO issued_books (user_id, book_id, issue_date,noofbooks_toreturn) VALUES ($1, $2, $3,$4)';
                await pool.query(queryInsertIssuedBook, [user_id, book_id, currentDate,quantityToIssue]);

            }
            else
            {   const noofbooks_toreturn=result1.rows[0].noofbooks_toreturn;
                const up_noofbooks_toreturn=noofbooks_toreturn+quantityToIssue;
                const query2='UPDATE issued_books SET noofbooks_toreturn = $1 ,issue_date= $2 WHERE user_id = $3 and book_id=$4';
                const values2 = [up_noofbooks_toreturn,currentDate,user_id, book_id,];
                await pool.query(query2,values2);
            }
            res.redirect(`/books`);

        } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).send('Internal Server Error');
    }
});
//get method to return a book by user.
app.get('/books/:id/return', authenticateUserbooks,async (req, res) => {
    try {
        const book_id = req.params.id;
        const user_id= parseInt(req.session.user.id);


        const query1='select * from issued_books where user_id=$1 and book_id=$2';
        const values1 = [user_id,book_id];
        const result1= await pool.query(query1, values1);

        // Redirect to the "/books" route after successfully adding the book

        res.status(200).render('returnbook', { book_id: book_id, noofbooks_toreturn: result1.rows[0].noofbooks_toreturn });
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).send('Internal Server Error');
    }
});

//post method to return book by user according to Noof books he took.
app.post('/books/:id/return', async (req, res) => {
    const book_id = req.params.id;
    const user_id= parseInt(req.session.user.id);
    const quantityToReturn = parseInt(req.body.Noreturn); // Convert the quantity to an integer

    try {
        // Fetch the book details from the database
        const queryGetBook = 'SELECT * FROM books WHERE id = $1';
        const bookResult = await pool.query(queryGetBook, [book_id]);
        const book = bookResult.rows[0];

        // Update the book's quantity in the database
        const updatedQuantity = book.quantity + quantityToReturn;
        const queryUpdateQuantity = 'UPDATE books SET quantity = $1 WHERE id = $2';
        await pool.query(queryUpdateQuantity, [updatedQuantity, book_id]);

        // Perform other operations if needed (e.g., update the issued_books table)
        const query1 = 'select * from issued_books where user_id =$1 and book_id= $2 ';
        const values1 = [user_id,book_id];
        const result1= await pool.query(query1, values1);
        const noofbooks_toreturn=result1.rows[0].noofbooks_toreturn;
        const newnofbooks_toreturn=noofbooks_toreturn - quantityToReturn;
        const currentDate = new Date().toISOString().split('T')[0];

        const query2 = 'UPDATE issued_books SET noofbooks_toreturn = $1,return_date= $4 WHERE user_id = $2 and book_id=$3';
        const values2 = [newnofbooks_toreturn,user_id,book_id,currentDate];
        await pool.query(query2,values2);



        // Redirect the user to a success page or the book's details page
        res.redirect(`/books`);
    } catch (err) {
        console.error('Error returning book:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = app;