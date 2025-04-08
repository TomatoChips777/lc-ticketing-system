const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.post('/create-report', upload.single('image_path'), (req, res) => {

    if (!req.body.user_id || !req.body.location || !req.body.description) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const { user_id, location, description ,is_anonymous } = req.body;
    const image_path = req.file ? req.file.filename : null;
    

    const query = `INSERT INTO tbl_reports (user_id, location, description, image_path, is_anonymous) VALUES (?, ?, ?, ?, ?)`;
    db.query(query, [user_id, location, description, image_path, is_anonymous], (err, result) => {
        if (err) {
            console.error("Error creating report:", err);
            return res.status(500).json({ success: false, message: 'Failed to submit report' });
        }
        // const newReport = { id: result.insertId, user_id, location, issue_type, description ,status: 'pending'};
        const newReport = {
            id: result.insertId,
            user_id,
            location,
            description,
            status: "pending",  // Initially set to 'pending'
            image_path: image_path || null // set image path if not null or null
        };
        // $message = "New report submitted {$issueType} issue at {$location}";
        const title = "Maintenance Report";
        const message = `New report submitted  issue at ${location}`;
        const notificationQuery = `INSERT INTO tbl_admin_notifications (report_id, user_id, message, title) VALUES (?, ?, ?, ?)`;

        db.query(notificationQuery, [result.insertId, user_id, message, title], (err, notificationResult) => {
            if (err) {
                console.error("Error creating notification:", err);
                return res.status(500).json({ success: false, message: 'Failed to create notification' });
            }
        });
        req.io.emit('update');
        req.io.emit('createdReport', newReport);
        // req.io.emit('new-notification');
        res.json({ success: true, message: 'Report submitted successfully', reportId: result.insertId });
    });
});

router.put('/:reportId', upload.single('image_path'), (req, res) => {
    const { reportId } = req.params;
    const { user_id, location, issue_type, description } = req.body;
    const image_path = req.file ? req.file.filename : null;

    // Fetch the current image path from the database
    const getImageQuery = `SELECT image_path FROM tbl_reports WHERE id = ? AND user_id = ?`;
    db.query(getImageQuery, [reportId, user_id], (err, rows) => {
        if (err) {
            console.error("Error fetching existing image:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch report" });
        }

        const existingImagePath = rows[0]?.image_path;

        // Delete old image if a new one is uploaded
        if (image_path && existingImagePath) {
            const oldImagePath = path.join('uploads', existingImagePath);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update report with new data and image path
        const query = `UPDATE tbl_reports SET location = ?, issue_type = ?, description = ?, image_path = ? WHERE id = ? AND user_id = ?`;
        db.query(query, [location, issue_type, description, image_path || existingImagePath, reportId, user_id], (err, result) => {
            if (err) {
                console.error("Error updating report:", err);
                return res.status(500).json({ success: false, message: "Failed to update report" });
            }
            // req.io.emit('reportUpdated', { reportId, location, issue_type, description, imagePath: image_path || existingImagePath });
            req.io.emit('update');
            res.json({ success: true, message: "Report updated successfully" });
        });
    });
});

router.delete('/admin/report/:id', (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'admin') {
        return res.status(400).json({ success: false, message: `Unauthorized: You cannot delete this report` });
    }

    db.query('SELECT image_path FROM tbl_reports WHERE id = ?', [id], (err, rows) => {
        if (err) {
            console.error("Error fetching report:", err);
            return res.status(500).json({ success: false, message: 'Failed to fetch report' });
        }
        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: "Unauthorized: You cannot delete this report" });
        }

        const imagePath = rows[0].image_path;
        if (imagePath) {
            const filePath = path.join(__dirname, '../uploads', imagePath);

            console.log("Attempting to delete file:", filePath);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err);
                    } else {
                        console.log("File deleted successfully:", filePath);
                    }
                });
            } else {
                console.warn("File not found:", filePath);
            }
        }

        db.query('DELETE FROM tbl_reports WHERE id = ?', [id], (err) => {
            if (err) {
                console.error("Error deleting report:", err);
                return res.status(500).json({ success: false, message: 'Failed to delete report' });
            }
            req.io.emit('reportDeleted', { reportId: id });
            res.json({ success: true, message: 'Report deleted successfully' });
        });
    });
});

// router.put('/report/archive-maintenance-report/:id', async (req, res) => {
//     const { id } = req.params;
//     try {
//         await db.query("UPDATE tbl_reports SET archived = 1 WHERE id = ?", [id]);
//         req.io.emit('update');
//         res.json({ success: true, message: "Report archived successfully" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: "Error archiving report" });
//     }
// });

router.delete('/report/:id', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: `User ID is required ${userId}` });
    }

    db.query('SELECT image_path FROM tbl_reports WHERE id = ? AND user_id = ?', [id, userId], (err, rows) => {
        if (err) {
            console.error("Error fetching report:", err);
            return res.status(500).json({ success: false, message: 'Failed to fetch report' });
        }
        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: "Unauthorized: You cannot delete this report" });
        }

        const imagePath = rows[0].image_path;
        if (imagePath) {
            const filePath = path.join(__dirname, '../uploads', imagePath);

            console.log("Attempting to delete file:", filePath);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err);
                    } else {
                        console.log("File deleted successfully:", filePath);
                    }
                });
            } else {
                console.warn("File not found:", filePath);
            }
        }

        db.query('DELETE FROM tbl_reports WHERE id = ? AND user_id = ?', [id, userId], (err) => {
            if (err) {
                console.error("Error deleting report:", err);
                return res.status(500).json({ success: false, message: 'Failed to delete report' });
            }
            // req.io.emit('reportDeleted', { reportId: id });
            req.io.emit('update');
            res.json({ success: true, message: 'Report deleted successfully' });
        });
    });
});

router.put('/report/archive-report/:id', (req, res) => {
    const { id } = req.params;
    const query = `UPDATE tbl_reports SET archived = 1 WHERE id = ?`;

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error("Error archiving report:", err);
            return res.status(500).json({ success: false, message: "Error archiving report" });
        }
        req.io.emit('update');
        res.json({ success: true, message: "Report archived successfully" });   
    })
    
});

// Get All Reports
router.get('/', (req, res) => {
    const query = `
        SELECT r.*,
        CASE 
                WHEN r.is_anonymous = 1 THEN 'Anonymous'
                ELSE u.name 
            END AS reporter_name
        FROM tbl_reports r 
        JOIN tbl_users u ON r.user_id = u.id WHERE archived = 0 AND report_type = ''
        ORDER BY r.created_at DESC`;
    db.query(query, (err, rows) => {
        if (err) {
            console.error("Error fetching all reports:", err);
            return res.status(500).json([]);
        }
        res.json(rows);
    });
});


router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;

    const query = `SELECT * FROM tbl_reports WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC`;
    db.query(query, [userId], (err, rows) => {
        if (err) {
            console.error("Error fetching user reports:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch reports" });
        }
        res.json({ success: true, reports: rows });
    });
});



router.put('/admin/edit/:reportId', (req, res) => {
    const reportId = req.params.reportId;
    const { status } = req.body;

    // Step 1: Retrieve the user_id associated with this report
    const getUserQuery = `SELECT user_id, issue_type, location FROM tbl_reports WHERE id = ?`;

    db.query(getUserQuery, [reportId], (err, result) => {
        if (err) {
            console.error("Error retrieving report details:", err);
            return res.status(500).json({ success: false, message: 'Failed to retrieve report details' });
        }

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const { user_id, issue_type, location } = result[0];

        const updateQuery = `UPDATE tbl_reports SET status = ? WHERE id = ?`;

        db.query(updateQuery, [status, reportId], (err, updateResult) => {
            if (err) {
                console.error("Error updating status:", err);
                return res.status(500).json({ success: false, message: 'Failed to update status' });
            }

            db.query(notificationQuery, [reportId, user_id, message, title], (err, notificationResult) => {
                if (err) {
                    console.error("Error creating notification:", err);
                    return res.status(500).json({ success: false, message: 'Failed to create notification' });
                }

                req.io.emit('updatedStatus', { reportId, status });
                req.io.emit('update');

                res.json({ success: true, message: 'Status updated successfully' });
            });
        });
    });
});


router.put("/admin/edit-report-type/:reportId", (req, res) => {
    const { report_type, category, priority, assigned_staff, status, type, item_name, contact_info, sender_id, location,description,is_anonymous } = req.body;
    const { reportId } = req.params;
    // Update `tbl_reports`
    const updateReportQuery = "UPDATE tbl_reports SET report_type = ?, status = ? WHERE id = ?";

    db.query(updateReportQuery, [report_type,"in_progress", reportId], (err, result) => {
        if (err) {
            console.error("Error updating report type:", err);
            return res.status(500).json({ success: false, message: "Failed to update report type" });
        }

        if (report_type === "Maintenance Report") {
            const maintenanceQuery = `
                INSERT INTO tbl_maintenance_reports (report_id, category, priority, assigned_staff) 
                VALUES (?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                category = ?, priority = ?, assigned_staff = ?`;

            db.query(
                maintenanceQuery,
                [reportId, category, priority, assigned_staff, category, priority, assigned_staff],
                (err, maintenanceResult) => {
                    if (err) {
                        console.error("Error updating maintenance report:", err);
                        return res.status(500).json({ success: false, message: "Failed to update maintenance report" });
                    }
                    req.io.emit('update'); // Notify frontend
                    res.json({ success: true, message: "Report updated successfully" });
                }
            );
        } else if (report_type === "Lost And Found") {
            const lostFoundQuery = `
                INSERT INTO tbl_lost_found (user_id, report_id, type, category, location, description, item_name, contact_info, is_anonymous) 
                VALUES (?, ?, ?, ?, ?, ? , ? , ?, ?) 
                ON DUPLICATE KEY UPDATE 
                type = ?, item_name = ?, contact_info = ?`;

            db.query(
                lostFoundQuery,
                [sender_id ,reportId, type,category, location, description, item_name, contact_info,is_anonymous, type, item_name, contact_info],
                (err, lostFoundResult) => {
                    if (err) {
                        console.error("Error updating lost and found report:", err);
                        return res.status(500).json({ success: false, message: "Failed to update lost and found report" });
                    }
                    req.io.emit('update'); // Notify frontend
                    res.json({ success: true, message: "Report updated successfully" });
                }
            );
        } else {
            req.io.emit('update'); // Notify frontend
            res.json({ success: true, message: "Report type updated successfully" });
        }
    });
});


module.exports = router;
