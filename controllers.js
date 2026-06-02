const db = require('./db');

/**
 * Get all tests with optional search and filters
 * GET /api/tests
 */
async function getAllTests(req, res) {
    try {
        const { q, status, type } = req.query;
        
        let sql = `
            SELECT t.id, t.test_id_string, t.test_type, t.notes, t.status, t.result_summary, t.test_date,
                   p.patient_name, p.contact_number, p.email_address, p.dob, p.registration_date
            FROM tests t
            JOIN patients p ON t.patient_id = p.id
            WHERE 1=1
        `;
        const params = [];

        // Apply Status Filter
        if (status && status !== 'All') {
            sql += ` AND t.status = ?`;
            params.push(status);
        }

        // Apply Test Type Filter
        if (type && type !== 'All') {
            sql += ` AND t.test_type = ?`;
            params.push(type);
        }

        // Apply Search (Patient Name or Test ID)
        if (q && q.trim() !== '') {
            sql += ` AND (p.patient_name LIKE ? OR t.test_id_string LIKE ?)`;
            const searchQuery = `%${q.trim()}%`;
            params.push(searchQuery, searchQuery);
        }

        // Order by date descending, then ID descending
        sql += ` ORDER BY t.test_date DESC, t.id DESC`;

        const tests = await db.query(sql, params);
        res.json(tests);
    } catch (err) {
        console.error("Error in getAllTests:", err);
        res.status(500).json({ error: "Failed to retrieve test records." });
    }
}

/**
 * Get dashboard stats
 * GET /api/tests/stats
 */
async function getStats(req, res) {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Calculate date 7 days ago for new patients metric
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0] + ' 00:00:00';

        // 1. Total Tests
        const totalTestsResult = await db.query("SELECT COUNT(*) as count FROM tests");
        const totalTests = totalTestsResult[0]?.count || 0;

        // 2. Pending Results
        const pendingResult = await db.query("SELECT COUNT(*) as count FROM tests WHERE status = 'Pending'");
        const pendingTests = pendingResult[0]?.count || 0;

        // 3. Completed Today
        const completedTodayResult = await db.query(
            "SELECT COUNT(*) as count FROM tests WHERE status = 'Completed' AND test_date = ?", 
            [todayStr]
        );
        const completedToday = completedTodayResult[0]?.count || 0;

        // 4. New Patients (registered in last 7 days)
        const newPatientsResult = await db.query(
            "SELECT COUNT(*) as count FROM patients WHERE registration_date >= ?", 
            [sevenDaysAgoStr]
        );
        const newPatients = newPatientsResult[0]?.count || 0;

        res.json({
            totalTests,
            pendingTests,
            completedToday,
            newPatients
        });
    } catch (err) {
        console.error("Error in getStats:", err);
        res.status(500).json({ error: "Failed to retrieve system statistics." });
    }
}

/**
 * Register a new test
 * POST /api/tests
 */
async function registerTest(req, res) {
    try {
        const { name, contact, email, dob, type, notes } = req.body;

        if (!name || !contact || !dob || !type) {
            return res.status(400).json({ error: "Missing required fields (name, contact, dob, type)." });
        }

        // 1. Check if patient already exists by contact number
        let patientId;
        const existingPatients = await db.query(
            "SELECT id FROM patients WHERE contact_number = ?",
            [contact]
        );

        if (existingPatients.length > 0) {
            patientId = existingPatients[0].id;
            
            // Proactively update email/dob in case they changed or were not set
            await db.execute(
                "UPDATE patients SET patient_name = ?, email_address = ?, dob = ? WHERE id = ?",
                [name, email || null, dob, patientId]
            );
        } else {
            // Create a new patient
            const result = await db.execute(
                "INSERT INTO patients (patient_name, contact_number, email_address, dob, registration_date) VALUES (?, ?, ?, ?, ?)",
                [name, contact, email || null, dob, new Date().toISOString().replace('T', ' ').split('.')[0]]
            );
            patientId = result.insertId;
        }

        // 2. Generate unique TST-XXX ID
        let testIdString;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
            const num = Math.floor(Math.random() * 900 + 100); // Generate 100-999
            testIdString = `TST-${num}`;
            
            const check = await db.query(
                "SELECT id FROM tests WHERE test_id_string = ?",
                [testIdString]
            );
            if (check.length === 0) {
                isUnique = true;
            }
            attempts++;
        }

        // Fallback in case of highly unlikely random collision limit
        if (!isUnique) {
            const countRow = await db.query("SELECT COUNT(*) as count FROM tests");
            testIdString = `TST-${String((countRow[0].count + 1) * 3).padStart(3, '0')}`;
        }

        // 3. Register test
        const todayStr = new Date().toISOString().split('T')[0];
        await db.execute(
            "INSERT INTO tests (test_id_string, patient_id, test_type, notes, status, result_summary, test_date) VALUES (?, ?, ?, ?, 'Pending', null, ?)",
            [testIdString, patientId, type, notes || null, todayStr]
        );

        res.status(201).json({
            message: "Test registered successfully.",
            testId: testIdString
        });
    } catch (err) {
        console.error("Error in registerTest:", err);
        res.status(500).json({ error: "Failed to register new test record." });
    }
}

/**
 * Update test result and status
 * PUT /api/tests/:testId
 */
async function updateTestResult(req, res) {
    try {
        const { testId } = req.params;
        const { status, result_summary } = req.body;

        if (!status) {
            return res.status(400).json({ error: "Missing required status field." });
        }

        // Update the record using the human-readable test_id_string (e.g. TST-001)
        const result = await db.execute(
            "UPDATE tests SET status = ?, result_summary = ? WHERE test_id_string = ?",
            [status, result_summary || null, testId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Test record with ID ${testId} not found.` });
        }

        res.json({ message: "Test result updated successfully." });
    } catch (err) {
        console.error("Error in updateTestResult:", err);
        res.status(500).json({ error: "Failed to update test record." });
    }
}

/**
 * Admin Login Verification
 * POST /api/auth/login
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const admins = await db.query(
            "SELECT id, username, role FROM admin WHERE username = ? AND password = ?",
            [username, password]
        );

        if (admins.length === 0) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        res.json({
            message: "Login successful.",
            user: {
                username: admins[0].username,
                role: admins[0].role
            }
        });
    } catch (err) {
        console.error("Error in login:", err);
        res.status(500).json({ error: "Authentication failed." });
    }
}

module.exports = {
    getAllTests,
    getStats,
    registerTest,
    updateTestResult,
    login
};
