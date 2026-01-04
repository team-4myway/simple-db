const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');

// Multer Config: Use UUID for filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate UUID, keep extension for simple OS preview if needed (optional)
    // User requested "ID based", so we just use UUID on disk.
    // We append extension just to be safe for some file readers, but strictly UUID is fine too.
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext); 
  }
});

const upload = multer({ storage: storage });

// Create Folder
router.post('/create-folder', async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        const userId = req.user.user_id;
        
        if (!name) return res.status(400).send("Folder name required");

        const db = getDB();
        await db.run(
            'INSERT INTO files (user_id, original_name, is_folder, parent_id, size, path, filename) VALUES (?, ?, 1, ?, 0, "", "")',
            [userId, name, parent_id || null]
        );
        res.status(201).send("Folder created");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// Upload Files
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded');
    }

    const userId = req.user.user_id;
    const parentId = req.body.parent_id === 'null' ? null : req.body.parent_id;

    const db = getDB();
    
    for (const file of req.files) {
        const { originalname, filename, path: filePath, size } = file;
        // filename is now the UUID (e.g., "550e8400... .jpg")
        
        await db.run(
          'INSERT INTO files (user_id, original_name, filename, path, size, is_folder, parent_id) VALUES (?, ?, ?, ?, ?, 0, ?)',
          [userId, originalname, filename, filePath, size, parentId]
        );
    }

    res.status(201).send('Files uploaded successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// List Files
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const parentId = req.query.parent_id || null;
    const db = getDB();
    
    let query = 'SELECT * FROM files WHERE user_id = ? AND parent_id IS ? ORDER BY is_folder DESC, upload_date DESC';
    let params = [userId, parentId];
    
    if (parentId === 'null' || parentId === null) {
        query = 'SELECT * FROM files WHERE user_id = ? AND parent_id IS NULL ORDER BY is_folder DESC, upload_date DESC';
        params = [userId];
    } else {
        query = 'SELECT * FROM files WHERE user_id = ? AND parent_id = ? ORDER BY is_folder DESC, upload_date DESC';
        params = [userId, parentId];
    }

    const files = await db.all(query, params);
    res.status(200).json(files);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Serve File Content (Image View)
router.get('/content/:id', async (req, res) => {
    try {
        const userId = req.user.user_id;
        const fileId = req.params.id;
        const db = getDB();
        
        const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
        
        if (!file || file.is_folder) {
          return res.status(404).send('File not found');
        }

        // Use absolute path
        const absolutePath = path.resolve(file.path);

        res.sendFile(absolutePath, (err) => {
            if (err) {
                console.error("SendFile error:", err);
                if (!res.headersSent) res.status(404).send("File not found on disk");
            }
        });

      } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
      }
});

// Download File
router.get('/download/:id', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const fileId = req.params.id;
    const db = getDB();
    
    const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
    
    if (!file || file.is_folder) {
      return res.status(404).send('File not found');
    }

    if (fs.existsSync(file.path)) {
       res.download(file.path, file.original_name);
    } else {
       res.status(404).send('File missing on server');
    }

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete File/Folder
router.delete('/delete/:id', async (req, res) => {
    try {
        const userId = req.user.user_id;
        const fileId = req.params.id;
        const db = getDB();

        // Simple delete (non-recursive for now to keep it safe/simple as requested)
        const file = await db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);
        if(file) {
            if(!file.is_folder && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            await db.run('DELETE FROM files WHERE id = ?', [fileId]);
        }
        
        res.status(200).send('Deleted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
