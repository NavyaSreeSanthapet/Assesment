const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Week4',
    password: 'NSree98',
    port: 5432,
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL successfully!');
});

// Event listener for connection errors
pool.on('error', (err) => {
    console.error('Error connecting to PostgreSQL:', err.message);
});

module.exports = pool;