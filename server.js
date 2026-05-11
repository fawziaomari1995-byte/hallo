const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const dbFile = process.env.RENDER ? '/tmp/events.db' : path.join(__dirname, 'db', 'events.db');

// Configure multer for file uploads
const uploadsDir = process.env.RENDER ? '/tmp/uploads' : path.join(__dirname, 'public', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  maxAge: 0
}));
if (process.env.RENDER) {
  app.use('/uploads', express.static('/tmp/uploads', {
    etag: false,
    lastModified: false,
    maxAge: 0
  }));
}
app.use(express.json());

const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'user', password: 'user123', role: 'normal' }
];
const sessions = new Map();
let mailTransporter = null;

const generateToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const getUserFromToken = (token) => sessions.get(token);

const createMailer = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  console.log('Ethereal email account created:', testAccount.user);
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

const initMailer = async () => {
  mailTransporter = await createMailer();
  console.log('Mail transporter initialized');
};

const sendResetPasswordEmail = async ({ email, username, token, host }) => {
  if (!mailTransporter) {
    throw new Error('Mailer not initialized');
  }
  const resetUrl = `${host}/reset-password?token=${encodeURIComponent(token)}`;
  const info = await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || '"فعالية درعا" <no-reply@daraa-events.local>',
    to: email,
    subject: 'إعادة تعيين كلمة المرور',
    html: `
      <p>مرحباً ${username},</p>
      <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك في موقع فعاليات درعا.</p>
      <p>اضغط الرابط التالي لإعادة تعيين كلمة المرور:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>إذا لم تطلب هذا، تجاهل الرسالة.</p>
      <p>الرابط صالح لمدة ساعة واحدة.</p>
    `
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('Reset password email preview URL:', previewUrl);
  }
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = token ? getUserFromToken(token) : null;
  if (!user) {
    return res.status(401).json({ error: 'غير مصرح بالدخول' });
  }
  req.user = user;
  next();
};

const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'صلاحية المدير مطلوبة' });
    }
    next();
  });
};

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Unable to open database:', err.message);
    process.exit(1);
  }
});

const initDb = () => {
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        attendees INTEGER NOT NULL DEFAULT 0,
        image TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'normal',
        isActivated INTEGER NOT NULL DEFAULT 0,
        activationToken TEXT,
        activationExpires INTEGER,
        resetPasswordToken TEXT,
        resetPasswordExpires INTEGER
      )
    `);

    db.all("PRAGMA table_info(events)", (err, cols) => {
      if (err) {
        console.error('Unable to read table schema:', err.message);
        return;
      }
      const hasAttendees = cols.some((col) => col.name === 'attendees');
      if (!hasAttendees) {
        db.run('ALTER TABLE events ADD COLUMN attendees INTEGER NOT NULL DEFAULT 0');
      }
      const hasArchived = cols.some((col) => col.name === 'archived');
      if (!hasArchived) {
        db.run('ALTER TABLE events ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
      }
      const hasLatitude = cols.some((col) => col.name === 'latitude');
      if (!hasLatitude) {
        db.run('ALTER TABLE events ADD COLUMN latitude REAL');
      }
      const hasLongitude = cols.some((col) => col.name === 'longitude');
      if (!hasLongitude) {
        db.run('ALTER TABLE events ADD COLUMN longitude REAL');
      }
      const hasImage = cols.some((col) => col.name === 'image');
      if (!hasImage) {
        db.run('ALTER TABLE events ADD COLUMN image TEXT');
      }
    });

    db.all("PRAGMA table_info(users)", (err, cols) => {
      if (err) {
        console.error('Unable to read users table schema:', err.message);
        return;
      }
      const hasEmail = cols.some((col) => col.name === 'email');
      if (!hasEmail) {
        db.run('ALTER TABLE users ADD COLUMN email TEXT');
      }
      db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      const hasActivated = cols.some((col) => col.name === 'isActivated');
      if (!hasActivated) {
        db.run('ALTER TABLE users ADD COLUMN isActivated INTEGER NOT NULL DEFAULT 0');
      }
      const hasActivationToken = cols.some((col) => col.name === 'activationToken');
      if (!hasActivationToken) {
        db.run("ALTER TABLE users ADD COLUMN activationToken TEXT");
      }
      const hasActivationExpires = cols.some((col) => col.name === 'activationExpires');
      if (!hasActivationExpires) {
        db.run("ALTER TABLE users ADD COLUMN activationExpires INTEGER");
      }      const hasResetPasswordToken = cols.some((col) => col.name === 'resetPasswordToken');
      if (!hasResetPasswordToken) {
        db.run('ALTER TABLE users ADD COLUMN resetPasswordToken TEXT');
      }
      const hasResetPasswordExpires = cols.some((col) => col.name === 'resetPasswordExpires');
      if (!hasResetPasswordExpires) {
        db.run('ALTER TABLE users ADD COLUMN resetPasswordExpires INTEGER');
      }    });

    db.get('SELECT COUNT(*) AS count FROM events', (err, row) => {
      if (err) {
        console.error('Database count error:', err.message);
        return;
      }

      if (row.count === 0) {
        const stmt = db.prepare(`INSERT INTO events (title, description, location, date, category, archived, image) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        const sampleEvents = [
          ['مهرجان الفنون التراثية', 'مهرجان يعرض إنتاج الحرف اليدوية والعروض الموسيقية.', 'مركز محافظة درعا', '2026-06-15', 'ثقافي', 0, '/uploads/sample-event.svg'],
          ['سباق جري المدينة', 'سباق جري مفتوح لجميع الأعمار لدعم النشاط الرياضي.', 'شارع السوق', '2026-06-22', 'رياضي', 0, null],
          ['ندوة تعليمية', 'محاضرة حول التراث المحلي وفرص التنمية الشبابية.', 'مكتبة درعا العامة', '2026-07-01', 'تعليمي', 0, null],
          ['مهرجان الربيع الماضي', 'مهرجان ربيعي احتفل به العام الماضي.', 'حديقة المدينة', '2024-04-15', 'ثقافي', 1, null]
        ];
        sampleEvents.forEach((event) => stmt.run(event));
        stmt.finalize();
      }
    });
  });
};

app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'اسم المستخدم والبريد الإلكتروني وكلمة المرور مطلوبة' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صالح' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = crypto.randomBytes(24).toString('hex');
    const activationExpires = Date.now() + 24 * 60 * 60 * 1000;
    const sql = 'INSERT INTO users (username, email, password, role, isActivated, activationToken, activationExpires) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(sql, [username, normalizedEmail, hashedPassword, 'normal', 0, activationToken, activationExpires], async function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
        }
        return res.status(500).json({ error: err.message });
      }

      try {
        await sendActivationEmail({
          email: normalizedEmail,
          username,
          token: activationToken,
          host: process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        });
      } catch (sendErr) {
        console.error('Activation email send failed:', sendErr);
        return res.status(500).json({ error: 'فشل إرسال رسالة التفعيل. حاول مرة أخرى لاحقاً.' });
      }

      res.status(201).json({ message: 'تم إنشاء الحساب بنجاح. تحقق من بريدك الإلكتروني لتفعيل الحساب.' });
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const hardcodedUser = users.find((item) => item.username === username);
  if (hardcodedUser && hardcodedUser.password === password) {
    const token = generateToken();
    sessions.set(token, { username: hardcodedUser.username, role: hardcodedUser.role });
    return res.json({ token, username: hardcodedUser.username, role: hardcodedUser.role });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).json({ error: 'بيانات تسجيل الدخول غير صحيحة' });
    }
    if (row.isActivated === 0) {
      return res.status(403).json({ error: 'الحساب غير مفعل. تحقق من بريدك الإلكتروني.' });
    }

    const token = generateToken();
    sessions.set(token, { username: row.username, role: row.role });
    res.json({ token, username: row.username, role: row.role });
  });
});

app.get('/api/activate', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('<h1>رمز التفعيل غير موجود</h1><p>يرجى استخدام رابط التفعيل المرسل إلى بريدك.</p>');
  }

  db.get('SELECT * FROM users WHERE activationToken = ?', [token], (err, row) => {
    if (err) {
      return res.status(500).send('<h1>خطأ في الخادم</h1><p>حاول مرة أخرى لاحقاً.</p>');
    }
    if (!row) {
      return res.status(400).send('<h1>رابط التفعيل غير صالح</h1><p>قد تكون صلاحية الرابط انتهت أو الرابط غير صحيح.</p>');
    }
    if (row.activationExpires && row.activationExpires < Date.now()) {
      return res.status(400).send('<h1>انتهت صلاحية الرابط</h1><p>اطلب تفعيل جديداً من صفحة التسجيل.</p>');
    }

    db.run('UPDATE users SET isActivated = 1, activationToken = NULL, activationExpires = NULL WHERE id = ?', [row.id], (updateErr) => {
      if (updateErr) {
        return res.status(500).send('<h1>خطأ في الخادم</h1><p>حاول مرة أخرى لاحقاً.</p>');
      }
      res.send('<h1>تم تفعيل الحساب بنجاح</h1><p>يمكنك الآن تسجيل الدخول من الصفحة الرئيسية.</p>');
    });
  });
});

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'لم يتم العثور على حساب بهذا البريد.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    db.run('UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?', [resetToken, resetExpires, row.id], async (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      try {
        await sendResetPasswordEmail({
          email: normalizedEmail,
          username: row.username,
          token: resetToken,
          host: process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        });
        res.json({ message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' });
      } catch (sendErr) {
        console.error('Reset password email send failed:', sendErr);
        res.status(500).json({ error: 'فشل إرسال رابط إعادة التعيين. حاول مرة أخرى لاحقاً.' });
      }
    });
  });
});

app.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'رمز التعيين وكلمة المرور مطلوبة.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' });
  }

  db.get('SELECT * FROM users WHERE resetPasswordToken = ?', [token], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(400).json({ error: 'رمز التعيين غير صالح.' });
    }
    if (row.resetPasswordExpires && row.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ error: 'انتهت صلاحية رمز التعيين.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run('UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?', [hashedPassword, row.id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }
        res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح.' });
      });
    } catch (hashErr) {
      res.status(500).json({ error: 'خطأ في معالجة كلمة المرور.' });
    }
  });
});

app.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('<h1>رمز التعيين غير موجود</h1><p>يرجى استخدام رابط إعادة التعيين المرسل إلى بريدك.</p>');
  }

  db.get('SELECT * FROM users WHERE resetPasswordToken = ?', [token], (err, row) => {
    if (err) {
      return res.status(500).send('<h1>خطأ في الخادم</h1><p>حاول مرة أخرى لاحقاً.</p>');
    }
    if (!row) {
      return res.status(400).send('<h1>رمز التعيين غير صالح</h1><p>قد تكون صلاحية الرابط انتهت أو الرابط غير صحيح.</p>');
    }
    if (row.resetPasswordExpires && row.resetPasswordExpires < Date.now()) {
      return res.status(400).send('<h1>انتهت صلاحية الرابط</h1><p>اطلب رابط جديد من صفحة تسجيل الدخول.</p>');
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إعادة تعيين كلمة المرور - فعالية درعا</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; text-align: center; margin-bottom: 30px; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 5px; color: #555; }
          input[type="password"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
          .button { background: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-size: 16px; }
          .button:hover { background: #0056b3; }
          .error { color: #dc3545; margin-top: 10px; }
          .success { color: #28a745; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>إعادة تعيين كلمة المرور</h1>
          <form id="resetForm">
            <div class="form-group">
              <label for="password">كلمة المرور الجديدة</label>
              <input type="password" id="password" name="password" placeholder="كلمة مرور قوية (6 أحرف على الأقل)" required />
            </div>
            <div class="form-group">
              <label for="confirmPassword">تأكيد كلمة المرور</label>
              <input type="password" id="confirmPassword" name="confirmPassword" placeholder="أعد إدخال كلمة المرور" required />
            </div>
            <button type="submit" class="button">إعادة تعيين كلمة المرور</button>
          </form>
          <div id="message"></div>
        </div>
        <script>
          document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const messageDiv = document.getElementById('message');

            if (password !== confirmPassword) {
              messageDiv.innerHTML = '<p class="error">كلمات المرور غير متطابقة.</p>';
              return;
            }

            try {
              const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: '${token}', password })
              });

              const result = await response.json();
              if (response.ok) {
                messageDiv.innerHTML = '<p class="success">' + result.message + '</p>';
                setTimeout(() => window.location.href = '/', 2000);
              } else {
                messageDiv.innerHTML = '<p class="error">' + result.error + '</p>';
              }
            } catch (error) {
              messageDiv.innerHTML = '<p class="error">حدث خطأ. حاول مرة أخرى.</p>';
            }
          });
        </script>
      </body>
      </html>
    `);
  });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    sessions.delete(token);
  }
  res.json({ logout: true });
});

app.get('/api/events', (req, res) => {
  const showArchived = req.query.archived === 'true';
  const sql = showArchived
    ? 'SELECT * FROM events ORDER BY date ASC'
    : 'SELECT * FROM events WHERE archived = 0 ORDER BY date ASC';

  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }
    res.json(row);
  });
});

app.post('/api/events/:id/attend', requireAuth, (req, res) => {
  const { id } = req.params;
  db.run('UPDATE events SET attendees = attendees + 1 WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }
    db.get('SELECT attendees FROM events WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: Number(id), attendees: row.attendees });
    });
  });
});

app.post('/api/events', requireAdmin, upload.single('image'), (req, res) => {
  const { title, description, location, latitude, longitude, date, category } = req.body;
  if (!title || !description || !location || !date || !category) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const sql = 'INSERT INTO events (title, description, location, latitude, longitude, date, category, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.run(sql, [title, description, location, parseFloat(latitude) || null, parseFloat(longitude) || null, date, category, image], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, title, description, location, latitude: parseFloat(latitude) || null, longitude: parseFloat(longitude) || null, date, category, attendees: 0, image });
  });
});

app.put('/api/events/:id', requireAdmin, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, description, location, latitude, longitude, date, category } = req.body;
  if (!title || !description || !location || !date || !category) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : req.body.currentImage;
  db.run(
    'UPDATE events SET title = ?, description = ?, location = ?, latitude = ?, longitude = ?, date = ?, category = ?, image = ? WHERE id = ?',
    [title, description, location, parseFloat(latitude) || null, parseFloat(longitude) || null, date, category, image, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'الفعالية غير موجودة' });
      }
      res.json({ id: Number(id), title, description, location, latitude: parseFloat(latitude) || null, longitude: parseFloat(longitude) || null, date, category });
    }
  );
});

app.put('/api/events/:id/archive', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { archived } = req.body;

  db.run('UPDATE events SET archived = ? WHERE id = ?', [archived ? 1 : 0, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }
    res.json({ id: Number(id), archived: archived ? 1 : 0 });
  });
});

app.delete('/api/events/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM events WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }
    res.json({ deleted: true });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb();

const startApp = async () => {
  try {
    await initMailer();
    startServer(PORT);
  } catch (err) {
    console.error('Failed to initialize mailer:', err);
    process.exit(1);
  }
};

const startServer = (port, maxRetries = 5) => {
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxRetries > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Trying port ${nextPort}...`);
      startServer(nextPort, maxRetries - 1);
      return;
    }

    if (err.code === 'EADDRINUSE') {
      console.error('Unable to start server:', err.message);
      process.exit(1);
    }

    console.error('Server error:', err.message);
    process.exit(1);
  });
};

startApp();
