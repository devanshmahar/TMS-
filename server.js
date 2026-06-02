const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const controllers = require('./controllers');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so the API can be accessed from other ports if necessary
app.use(cors());

// Body Parsers for handling JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend assets (index.html, styles.css, script.js, etc.) statically
// from the current project directory
app.use(express.static(path.join(__dirname)));

/**
 * API Routing Definitions
 */

// Retrieve list of all tests (joined with patient info) with optional filters
app.get('/api/tests', controllers.getAllTests);

// Retrieve calculated statistics summary for the overview cards
app.get('/api/tests/stats', controllers.getStats);

// Submit form to register a new laboratory test (atomic patient-test creation)
app.post('/api/tests', controllers.registerTest);

// Save test status changes and findings text
app.put('/api/tests/:testId', controllers.updateTestResult);

// Admin Login validation
app.post('/api/auth/login', controllers.login);

/**
 * Root redirect: point '/' to the login page
 */
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

/**
 * SPA Fallback route:
 * Direct all other GET requests to the index.html frontend application
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening for connections
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` TMS (Test Management System) Full-Stack Application`);
    console.log(` Local Server running at: http://localhost:${PORT}`);
    console.log(`==================================================`);
});
