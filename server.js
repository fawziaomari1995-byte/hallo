const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const dbDir = process.env.RENDER ? '/tmp' : path.join(__dirname, 'db');
const dbFile = path.join(dbDir, 'events.db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

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
// For most routes we use JSON parser. For Stripe webhook route we will use raw body parser.
app.use((req, res, next) => {
  // let specific routes opt into raw later
  next();
});
app.use(express.json());

// Initialize Stripe if key present
const stripeSecret = process.env.STRIPE_SECRET_KEY || null;
const stripe = stripeSecret ? Stripe(stripeSecret) : null;

const attachOptionalUser = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  req.user = token ? getUserFromToken(token) : null;
  next();
};
app.use(attachOptionalUser);

const users = [
  { id: 0, username: 'admin', password: 'admin123', role: 'admin' },
  { id: -1, username: 'user', password: 'user123', role: 'normal' }
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

const sendActivationEmail = async ({ email, username, token, host }) => {
  if (!mailTransporter) {
    throw new Error('Mailer not initialized');
  }
  const activationUrl = `${host}/api/activate?token=${encodeURIComponent(token)}`;
  const info = await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || '"فعالية درعا" <no-reply@daraa-events.local>',
    to: email,
    subject: 'تفعيل الحساب',
    html: `
      <p>مرحباً ${username},</p>
      <p>شكراً لتسجيلك في موقع فعاليات درعا.</p>
      <p>اضغط الرابط التالي لتفعيل حسابك:</p>
      <p><a href="${activationUrl}">${activationUrl}</a></p>
      <p>إذا لم تطلب هذا، تجاهل الرسالة.</p>
      <p>الرابط صالح لمدة 24 ساعة.</p>
    `
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('Activation email preview URL:', previewUrl);
  }
};

const generateTicketPdf = (ticketData, qrFile, pdfFile) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A6', margin: 20 });
    const stream = fs.createWriteStream(pdfFile);
    doc.pipe(stream);

    doc.fontSize(16).text('تذكرة فعالية', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`الفعالية: ${ticketData.eventTitle || ''}`);
    doc.text(`النوع: ${ticketData.ticketType || 'عام'}`);
    if (ticketData.isVirtual) {
      doc.text('تذكرة افتراضية للبث المباشر');
    } else {
      doc.text(`المقعد: ${ticketData.seatCategory || '-'} رقم ${ticketData.seatNumber || '-'}`);
    }
    doc.text(`رمز التذكرة: ${ticketData.ticketCode}`);
    doc.moveDown();
    if (fs.existsSync(qrFile)) {
      try {
        doc.image(qrFile, { fit: [150, 150], align: 'center' });
      } catch (imgErr) {
        console.error('Unable to embed QR in PDF:', imgErr);
      }
    }
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
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

    // Add missing columns to events table
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
      const hasIsHybrid = cols.some((col) => col.name === 'isHybrid');
      if (!hasIsHybrid) {
        db.run('ALTER TABLE events ADD COLUMN isHybrid INTEGER NOT NULL DEFAULT 0');
      }
      const hasStreamUrl = cols.some((col) => col.name === 'streamUrl');
      if (!hasStreamUrl) {
        db.run('ALTER TABLE events ADD COLUMN streamUrl TEXT');
      }
      const hasVirtualPriceCents = cols.some((col) => col.name === 'virtualPriceCents');
      if (!hasVirtualPriceCents) {
        db.run('ALTER TABLE events ADD COLUMN virtualPriceCents INTEGER NOT NULL DEFAULT 1500');
      }
      const hasBudgetCents = cols.some((col) => col.name === 'budgetCents');
      if (!hasBudgetCents) {
        db.run('ALTER TABLE events ADD COLUMN budgetCents INTEGER NOT NULL DEFAULT 0');
      }
      const hasDistrict = cols.some((col) => col.name === 'district');
      if (!hasDistrict) {
        db.run('ALTER TABLE events ADD COLUMN district TEXT');
      }

      // After adding columns, check if we need to insert sample data
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

    // Add comments table for community interaction
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        FOREIGN KEY(eventId) REFERENCES events(id)
      )
    `);

    db.all("PRAGMA table_info(comments)", (err, cols) => {
      if (err) {
        console.error('Unable to read comments table schema:', err.message);
        return;
      }
      const hasRatingColumn = cols.some((col) => col.name === 'rating');
      if (!hasRatingColumn) {
        db.run('ALTER TABLE comments ADD COLUMN rating INTEGER');
      }
    });

    // Add event_media table for gallery support
    db.run(`
      CREATE TABLE IF NOT EXISTS event_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        filename TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(eventId) REFERENCES events(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        userId INTEGER,
        username TEXT,
        ticketType TEXT,
        priceCents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'usd',
        paymentProvider TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        ticketCode TEXT UNIQUE,
        qrPath TEXT,
        pdfPath TEXT,
        isVirtual INTEGER NOT NULL DEFAULT 0,
        seatNumber INTEGER,
        seatCategory TEXT,
        streamUrl TEXT,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        FOREIGN KEY(eventId) REFERENCES events(id),
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticketId INTEGER,
        provider TEXT,
        providerChargeId TEXT,
        amountCents INTEGER,
        currency TEXT,
        status TEXT,
        rawResponse TEXT,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        FOREIGN KEY(ticketId) REFERENCES tickets(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        username TEXT NOT NULL,
        status TEXT NOT NULL,
        updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now')),
        UNIQUE(eventId, userId),
        FOREIGN KEY(eventId) REFERENCES events(id),
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `);

    // Add missing columns to users table
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
      }
      const hasResetPasswordToken = cols.some((col) => col.name === 'resetPasswordToken');
      if (!hasResetPasswordToken) {
        db.run('ALTER TABLE users ADD COLUMN resetPasswordToken TEXT');
      }
      const hasResetPasswordExpires = cols.some((col) => col.name === 'resetPasswordExpires');
      if (!hasResetPasswordExpires) {
        db.run('ALTER TABLE users ADD COLUMN resetPasswordExpires INTEGER');
      }
    });

    db.all("PRAGMA table_info(tickets)", (err, cols) => {
      if (err) {
        console.error('Unable to read tickets table schema:', err.message);
        return;
      }
      const hasSeatNumber = cols.some((col) => col.name === 'seatNumber');
      if (!hasSeatNumber) {
        db.run('ALTER TABLE tickets ADD COLUMN seatNumber INTEGER');
      }
      const hasSeatCategory = cols.some((col) => col.name === 'seatCategory');
      if (!hasSeatCategory) {
        db.run('ALTER TABLE tickets ADD COLUMN seatCategory TEXT');
      }
      const hasIsVirtual = cols.some((col) => col.name === 'isVirtual');
      if (!hasIsVirtual) {
        db.run('ALTER TABLE tickets ADD COLUMN isVirtual INTEGER NOT NULL DEFAULT 0');
      }
      const hasPaymentProvider = cols.some((col) => col.name === 'paymentProvider');
      if (!hasPaymentProvider) {
        db.run('ALTER TABLE tickets ADD COLUMN paymentProvider TEXT');
      }
      const hasStreamUrlTicket = cols.some((col) => col.name === 'streamUrl');
      if (!hasStreamUrlTicket) {
        db.run('ALTER TABLE tickets ADD COLUMN streamUrl TEXT');
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

app.post('/api/resend-activation', async (req, res) => {
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
    if (row.isActivated === 1) {
      return res.status(400).json({ error: 'الحساب مفعل بالفعل.' });
    }

    const activationToken = crypto.randomBytes(24).toString('hex');
    const activationExpires = Date.now() + 24 * 60 * 60 * 1000;
    db.run('UPDATE users SET activationToken = ?, activationExpires = ? WHERE id = ?', [activationToken, activationExpires, row.id], async (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      try {
        await sendActivationEmail({
          email: normalizedEmail,
          username: row.username,
          token: activationToken,
          host: process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        });
        res.json({ message: 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني.' });
      } catch (sendErr) {
        console.error('Activation email send failed:', sendErr);
        res.status(500).json({ error: 'فشل إرسال رابط التفعيل. حاول مرة أخرى لاحقاً.' });
      }
    });
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const hardcodedUser = users.find((item) => item.username === username);
  if (hardcodedUser && hardcodedUser.password === password) {
    const token = generateToken();
    sessions.set(token, { id: hardcodedUser.id, username: hardcodedUser.username, role: hardcodedUser.role, email: null });
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
    sessions.set(token, { id: row.id, username: row.username, role: row.role, email: row.email });
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
    ? `SELECT e.*, (SELECT COUNT(*) FROM comments c WHERE c.eventId = e.id) AS commentCount,
           (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'attending') AS attendingCount,
           (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'maybe') AS maybeCount,
           (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'declined') AS declinedCount
       FROM events e ORDER BY date ASC`
    : `SELECT e.*, (SELECT COUNT(*) FROM comments c WHERE c.eventId = e.id) AS commentCount,
           (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'attending') AS attendingCount,
           (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'maybe') AS maybeCount,
           (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'declined') AS declinedCount
       FROM events e WHERE archived = 0 ORDER BY date ASC`;

  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const eventIds = rows.map((event) => event.id);
    if (eventIds.length === 0) {
      return res.json(rows.map((event) => ({
        ...event,
        attendingCount: 0,
        maybeCount: 0,
        declinedCount: 0,
        myAttendanceStatus: null,
        media: []
      })));
    }

    const mediaQuery = `SELECT id, eventId, type, url, filename FROM event_media WHERE eventId IN (${eventIds.map(() => '?').join(',')}) ORDER BY position ASC, id ASC`;
    db.all(mediaQuery, eventIds, (err2, mediaRows) => {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }

      const mediaByEvent = mediaRows.reduce((acc, item) => {
        acc[item.eventId] = acc[item.eventId] || [];
        acc[item.eventId].push(item);
        return acc;
      }, {});

      const applyStatus = (statusRows) => {
        const statusByEvent = (statusRows || []).reduce((acc, item) => {
          acc[item.eventId] = item.status;
          return acc;
        }, {});

        const enhancedEvents = rows.map((event) => ({
          ...event,
          myAttendanceStatus: statusByEvent[event.id] || null,
          attendingCount: event.attendingCount || 0,
          maybeCount: event.maybeCount || 0,
          declinedCount: event.declinedCount || 0,
          media: mediaByEvent[event.id] && mediaByEvent[event.id].length > 0
            ? mediaByEvent[event.id]
            : event.image ? [{ id: null, eventId: event.id, type: 'image', url: event.image, filename: null }] : []
        }));

        res.json(enhancedEvents);
      };

      if (req.user) {
        const statusQuery = `SELECT eventId, status FROM attendance WHERE eventId IN (${eventIds.map(() => '?').join(',')}) AND userId = ?`;
        db.all(statusQuery, [...eventIds, req.user.id], (err3, statusRows) => {
          if (err3) {
            return res.status(500).json({ error: err3.message });
          }
          applyStatus(statusRows);
        });
      } else {
        applyStatus([]);
      }
    });
  });
});

app.get('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT e.*,
      (SELECT COUNT(*) FROM comments c WHERE c.eventId = e.id) AS commentCount,
      (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'attending') AS attendingCount,
      (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'maybe') AS maybeCount,
      (SELECT COUNT(*) FROM attendance a WHERE a.eventId = e.id AND a.status = 'declined') AS declinedCount
    FROM events e WHERE e.id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }

    db.all('SELECT id, eventId, type, url, filename FROM event_media WHERE eventId = ? ORDER BY position ASC, id ASC', [id], (err2, mediaRows) => {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }

      const media = mediaRows.length > 0
        ? mediaRows
        : row.image ? [{ id: null, eventId: row.id, type: 'image', url: row.image, filename: null }] : [];

      const eventData = {
        ...row,
        attendingCount: row.attendingCount || 0,
        maybeCount: row.maybeCount || 0,
        declinedCount: row.declinedCount || 0,
        media
      };

      if (!req.user) {
        return res.json({ ...eventData, myAttendanceStatus: null });
      }

      db.get('SELECT status FROM attendance WHERE eventId = ? AND userId = ?', [id, req.user.id], (err3, statusRow) => {
        if (err3) {
          return res.status(500).json({ error: err3.message });
        }

        const now = new Date().toISOString();
        db.get(
          `SELECT COUNT(*) AS ticketCount FROM tickets t
           LEFT JOIN events e ON e.id = t.eventId
             WHERE t.eventId = ? AND t.userId = ? AND t.status IN ('paid', 'scanned')`,
          [id, req.user.id],
          (err4, ticketRow) => {
            if (err4) {
              return res.status(500).json({ error: err4.message });
            }

            // Also check attendance table: allow reviews for users who marked they were attending
            db.get('SELECT COUNT(*) AS attendanceCount FROM attendance WHERE eventId = ? AND userId = ? AND status = ?', [id, req.user.id, 'attending'], (errA, attendRow) => {
              if (errA) {
                return res.status(500).json({ error: errA.message });
              }

              db.get('SELECT COUNT(*) AS userReviewed FROM comments WHERE eventId = ? AND username = ?', [id, req.user.username], (err5, commentRow) => {
                if (err5) {
                  return res.status(500).json({ error: err5.message });
                }

                const hasTicket = ticketRow && ticketRow.ticketCount > 0;
                const hasAttendance = attendRow && attendRow.attendanceCount > 0;
                const hasReviewed = commentRow && commentRow.userReviewed > 0;
                const eventDate = row.date ? new Date(row.date) : null;
                const nowDate = new Date();
                // Allow review if user had a valid ticket OR marked attendance; still require event date to be on/after event
                const canReview = (hasTicket || hasAttendance) && eventDate && eventDate <= nowDate;

                res.json({
                  ...eventData,
                  myAttendanceStatus: statusRow ? statusRow.status : null,
                  userHasTicket: hasTicket,
                  userHasAttendance: hasAttendance,
                  userHasCommented: hasReviewed,
                  userCanReview: canReview
                });
              });
            });
          }
        );
      });
    });
  });
});

app.post('/api/events/:id/rsvp', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['attending', 'maybe', 'declined'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'حالة الحضور غير صحيحة' });
  }

  db.get('SELECT id FROM events WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }

    const updatedAt = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO attendance (eventId, userId, username, status, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(eventId, userId) DO UPDATE SET status = excluded.status, username = excluded.username, updatedAt = excluded.updatedAt`,
      [id, req.user.id, req.user.username, status, updatedAt], function (insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        const countQuery = `SELECT
            SUM(CASE WHEN status = 'attending' THEN 1 ELSE 0 END) AS attendingCount,
            SUM(CASE WHEN status = 'maybe' THEN 1 ELSE 0 END) AS maybeCount,
            SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) AS declinedCount
          FROM attendance WHERE eventId = ?`;

        db.get(countQuery, [id], (countErr, counts) => {
          if (countErr) {
            return res.status(500).json({ error: countErr.message });
          }

          res.json({
            eventId: Number(id),
            status,
            attendingCount: counts.attendingCount || 0,
            maybeCount: counts.maybeCount || 0,
            declinedCount: counts.declinedCount || 0
          });
        });
      }
    );
  });
});

app.get('/api/events/:id/comments', (req, res) => {
  const { id } = req.params;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);
  const offset = (page - 1) * limit;

  db.get('SELECT COUNT(*) AS total FROM comments WHERE eventId = ?', [id], (err, totalRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all(
      'SELECT id, eventId, username, content, rating, createdAt FROM comments WHERE eventId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [id, limit, offset],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          comments: rows.map((comment) => ({
            ...comment,
            createdAt: comment.createdAt ? new Date(comment.createdAt * 1000).toISOString() : null
          })),
          page,
          limit,
          totalComments: totalRow.total
        });
      }
    );
  });
});

app.put('/api/comments/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'التعليق لا يمكن أن يكون فارغاً' });
  }

  db.run('UPDATE comments SET content = ? WHERE id = ?', [content.trim(), id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'التعليق غير موجود' });
    }
    db.get('SELECT id, eventId, username, content, createdAt FROM comments WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        ...row,
        createdAt: row.createdAt ? new Date(row.createdAt * 1000).toISOString() : null
      });
    });
  });
});

app.delete('/api/comments/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM comments WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'التعليق غير موجود' });
    }
    res.json({ deleted: true, id: Number(id) });
  });
});

app.post('/api/events/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params;
  const { content, rating } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'التعليق لا يمكن أن يكون فارغاً' });
  }

  const numericRating = Number(rating);
  const ratingValue = Number.isInteger(numericRating) && numericRating >= 1 && numericRating <= 5 ? numericRating : null;
  const now = new Date().toISOString();

  // First, allow users who marked attendance as 'attending' to post reviews
  db.get('SELECT status FROM attendance WHERE eventId = ? AND userId = ? LIMIT 1', [id, req.user.id], (errA, attendRow) => {
    if (errA) return res.status(500).json({ error: errA.message });

    const proceedToInsert = () => {
      db.get('SELECT COUNT(*) AS existing FROM comments WHERE eventId = ? AND username = ?', [id, req.user.username], (err3, existingRow) => {
        if (err3) {
          return res.status(500).json({ error: err3.message });
        }
        if (existingRow && existingRow.existing > 0) {
          return res.status(400).json({ error: 'لقد قمت بإضافة تقييم لهذه الفعالية بالفعل' });
        }

        const createdAt = Math.floor(Date.now() / 1000);
        db.run(
          'INSERT INTO comments (eventId, username, content, rating, createdAt) VALUES (?, ?, ?, ?, ?)',
          [id, req.user.username, content.trim(), ratingValue, createdAt],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
              id: this.lastID,
              eventId: Number(id),
              username: req.user.username,
              content: content.trim(),
              rating: ratingValue,
              createdAt: new Date(createdAt * 1000).toISOString()
            });
          }
        );
      });
    };

    if (attendRow && attendRow.status === 'attending') {
      // User marked attendance — allow posting
      return proceedToInsert();
    }

    // Otherwise, fall back to checking for a valid paid/scanned ticket (and that event date passed)
    db.get(
      `SELECT 1 FROM tickets t
       LEFT JOIN events e ON e.id = t.eventId
       WHERE t.eventId = ? AND t.userId = ? AND t.status IN ('paid', 'scanned') AND date(e.date) <= date(?) LIMIT 1`,
      [id, req.user.id, now],
      (err2, ticketRow) => {
        if (err2) {
          return res.status(500).json({ error: err2.message });
        }
        if (!ticketRow) {
          return res.status(403).json({ error: 'غير مسموح بإضافة مراجعة لهذه الفعالية' });
        }
        return proceedToInsert();
      }
    );
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

app.post('/api/events', requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mediaFiles', maxCount: 10 }]), (req, res) => {
  const { title, description, location, latitude, longitude, date, category, district, budgetCents, videoUrl, isHybrid, streamUrl, virtualPriceCents } = req.body;
  if (!title || !description || !location || !date || !category) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const files = req.files || {};
  const mediaFiles = files.mediaFiles || [];
  const primaryImageFile = files.image?.[0] || mediaFiles.find((file) => file.mimetype.startsWith('image/'));
  const image = primaryImageFile ? `/uploads/${primaryImageFile.filename}` : null;
  const sql = 'INSERT INTO events (title, description, location, latitude, longitude, date, category, district, budgetCents, image, isHybrid, streamUrl, virtualPriceCents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  db.run(sql, [title, description, location, parseFloat(latitude) || null, parseFloat(longitude) || null, date, category, district || '', parseInt(budgetCents, 10) || 0, image, isHybrid === 'true' || isHybrid === '1' ? 1 : 0, streamUrl || null, parseInt(virtualPriceCents, 10) || 1500], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const eventId = this.lastID;
    const inserts = [];

    if (files.image && files.image[0]) {
      inserts.push({ type: 'image', url: `/uploads/${files.image[0].filename}`, filename: files.image[0].filename });
    }

    mediaFiles.forEach((file) => {
      const type = file.mimetype.startsWith('video/') ? 'video' : 'image';
      inserts.push({ type, url: `/uploads/${file.filename}`, filename: file.filename });
    });

    if (videoUrl && videoUrl.trim()) {
      inserts.push({ type: 'video', url: videoUrl.trim(), filename: null });
    }

    if (inserts.length === 0) {
      return res.status(201).json({ id: eventId, title, description, location, latitude: parseFloat(latitude) || null, longitude: parseFloat(longitude) || null, date, category, attendees: 0, isHybrid: isHybrid === 'true' || isHybrid === '1' ? 1 : 0, streamUrl: streamUrl || null, virtualPriceCents: parseInt(virtualPriceCents, 10) || 1500, media: image ? [{ type: 'image', url: image }] : [] });
    }

    const stmt = db.prepare('INSERT INTO event_media (eventId, type, url, filename) VALUES (?, ?, ?, ?)');
    inserts.forEach((media) => stmt.run(eventId, media.type, media.url, media.filename));
    stmt.finalize((insertErr) => {
      if (insertErr) {
        return res.status(500).json({ error: insertErr.message });
      }
      res.status(201).json({ id: eventId, title, description, location, latitude: parseFloat(latitude) || null, longitude: parseFloat(longitude) || null, date, category, attendees: 0, media: inserts });
    });
  });
});

app.put('/api/events/:id', requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mediaFiles', maxCount: 10 }]), (req, res) => {
  const { id } = req.params;
  const { title, description, location, latitude, longitude, date, category, videoUrl, isHybrid, streamUrl, virtualPriceCents, removedMediaIds, currentImage } = req.body;
  if (!title || !description || !location || !date || !category) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const files = req.files || {};
  const mediaFiles = files.mediaFiles || [];
  let image = currentImage || null;
  const primaryImageFile = files.image?.[0] || mediaFiles.find((file) => file.mimetype.startsWith('image/'));
  if (primaryImageFile) {
    image = `/uploads/${primaryImageFile.filename}`;
  }

  const deleteIds = [];
  if (removedMediaIds) {
    try {
      const parsed = typeof removedMediaIds === 'string' ? JSON.parse(removedMediaIds) : removedMediaIds;
      if (Array.isArray(parsed)) {
        deleteIds.push(...parsed.map((item) => Number(item)).filter((item) => !Number.isNaN(item)));
      }
    } catch (parseError) {
      // ignore invalid remove list
    }
  }

  const updates = [];
  if (deleteIds.length > 0) {
    const placeholders = deleteIds.map(() => '?').join(',');
    updates.push(new Promise((resolve, reject) => {
      db.run(`DELETE FROM event_media WHERE id IN (${placeholders}) AND eventId = ?`, [...deleteIds, id], function (err) {
        if (err) return reject(err);
        resolve();
      });
    }));
  }

  const insertMedia = (eventId) => new Promise((resolve, reject) => {
    const mediaInserts = [];
    if (files.image && files.image[0]) {
      mediaInserts.push({ type: 'image', url: `/uploads/${files.image[0].filename}`, filename: files.image[0].filename });
    }
    mediaFiles.forEach((file) => {
      const type = file.mimetype.startsWith('video/') ? 'video' : 'image';
      mediaInserts.push({ type, url: `/uploads/${file.filename}`, filename: file.filename });
    });
    if (videoUrl && videoUrl.trim()) {
      mediaInserts.push({ type: 'video', url: videoUrl.trim(), filename: null });
    }
    if (mediaInserts.length === 0) return resolve();
    const stmt = db.prepare('INSERT INTO event_media (eventId, type, url, filename) VALUES (?, ?, ?, ?)');
    mediaInserts.forEach((media) => stmt.run(eventId, media.type, media.url, media.filename));
    stmt.finalize((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  updates.push(insertMedia(id));

  Promise.all(updates)
    .then(() => {
      db.run(
        'UPDATE events SET title = ?, description = ?, location = ?, latitude = ?, longitude = ?, date = ?, category = ?, district = ?, budgetCents = ?, image = ?, isHybrid = ?, streamUrl = ?, virtualPriceCents = ? WHERE id = ?',
        [title, description, location, parseFloat(latitude) || null, parseFloat(longitude) || null, date, category, req.body.district || '', parseInt(req.body.budgetCents, 10) || 0, image, isHybrid === 'true' || isHybrid === '1' ? 1 : 0, streamUrl || null, parseInt(virtualPriceCents, 10) || 1500, id],
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
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
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

app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, email, role, isActivated FROM users ORDER BY username ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map((user) => ({
      ...user,
      isActivated: Boolean(user.isActivated)
    })));
  });
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { username, email, password, role, isActivated } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  if (!['admin', 'normal'].includes(role)) {
    return res.status(400).json({ error: 'الدور غير صالح' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صالح' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = isActivated ? null : crypto.randomBytes(24).toString('hex');
    const activationExpires = isActivated ? null : Date.now() + 24 * 60 * 60 * 1000;
    const sql = 'INSERT INTO users (username, email, password, role, isActivated, activationToken, activationExpires) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(sql, [username, normalizedEmail, hashedPassword, role, isActivated ? 1 : 0, activationToken, activationExpires], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (!isActivated) {
        sendActivationEmail({
          email: normalizedEmail,
          username,
          token: activationToken,
          host: process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        }).catch((mailErr) => {
          console.error('Activation email send failed:', mailErr);
        });
      }
      res.status(201).json({ id: this.lastID, username, email: normalizedEmail, role, isActivated: Boolean(isActivated) });
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/admin/users/:id/resend-activation', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, username, email, isActivated FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    if (user.isActivated === 1) {
      return res.status(400).json({ error: 'الحساب مفعل بالفعل' });
    }

    const activationToken = crypto.randomBytes(24).toString('hex');
    const activationExpires = Date.now() + 24 * 60 * 60 * 1000;
    db.run('UPDATE users SET activationToken = ?, activationExpires = ? WHERE id = ?', [activationToken, activationExpires, id], async function (updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }

      try {
        await sendActivationEmail({
          email: user.email,
          username: user.username,
          token: activationToken,
          host: process.env.APP_URL || `${req.protocol}://${req.get('host')}`
        });
        res.json({ message: 'تم إرسال رابط التفعيل مرة أخرى.' });
      } catch (sendErr) {
        console.error('Activation email send failed:', sendErr);
        res.status(500).json({ error: 'فشل إعادة إرسال رابط التفعيل. حاول مرة أخرى لاحقاً.' });
      }
    });
  });
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role, isActivated } = req.body;

  const updates = [];
  const params = [];

  if (typeof role !== 'undefined') {
    if (!['admin', 'normal'].includes(role)) {
      return res.status(400).json({ error: 'الدور غير صالح' });
    }
    updates.push('role = ?');
    params.push(role);
  }

  if (typeof isActivated !== 'undefined') {
    updates.push('isActivated = ?');
    params.push(isActivated ? 1 : 0);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'لم يتم إرسال بيانات للتحديث' });
  }

  params.push(id);
  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    db.get('SELECT id, username, email, role, isActivated FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ ...user, isActivated: Boolean(user.isActivated) });
    });
  });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.get('SELECT username FROM users WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    if (row.username === req.user.username) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك بنفسك' });
    }
    db.run('DELETE FROM users WHERE id = ?', [id], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: deleteErr.message });
      }
      res.json({ deleted: true });
    });
  });
});

app.get('/api/admin/analytics', requireAdmin, (req, res) => {
  db.get(`
    SELECT
      COUNT(*) AS totalTicketsSold,
      COALESCE(SUM(priceCents), 0) AS totalRevenueCents,
      SUM(CASE WHEN isVirtual = 1 THEN 1 ELSE 0 END) AS totalVirtualTickets,
      SUM(CASE WHEN isVirtual = 0 THEN 1 ELSE 0 END) AS totalSeatTickets
    FROM tickets
    WHERE status = 'paid'
  `, (err, summary) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all(`
      SELECT e.id, e.title,
        COUNT(t.id) AS ticketsSold,
        COALESCE(SUM(t.priceCents), 0) AS revenueCents
      FROM events e
      LEFT JOIN tickets t ON e.id = t.eventId AND t.status = 'paid'
      GROUP BY e.id
      ORDER BY revenueCents DESC
      LIMIT 6
    `, (err2, topEvents) => {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }

      db.all(`
        SELECT status, COUNT(*) AS count
        FROM attendance
        GROUP BY status
      `, (err3, attendanceOverview) => {
        if (err3) {
          return res.status(500).json({ error: err3.message });
        }

        db.all(`
          SELECT ticketType, COUNT(*) AS count, COALESCE(SUM(priceCents), 0) AS revenueCents
          FROM tickets
          WHERE status = 'paid'
          GROUP BY ticketType
        `, (err4, ticketTypeBreakdown) => {
          if (err4) {
            return res.status(500).json({ error: err4.message });
          }

          db.all(`
            SELECT date(createdAt, 'unixepoch') AS day,
              COUNT(*) AS ticketCount,
              COALESCE(SUM(priceCents), 0) AS revenueCents
            FROM tickets
            WHERE status = 'paid' AND createdAt >= strftime('%s','now','-6 days')
            GROUP BY day
            ORDER BY day ASC
          `, (err5, revenueTimeline) => {
            if (err5) {
              return res.status(500).json({ error: err5.message });
            }

            res.json({
              totalTicketsSold: summary.totalTicketsSold || 0,
              totalRevenueCents: summary.totalRevenueCents || 0,
              totalVirtualTickets: summary.totalVirtualTickets || 0,
              totalSeatTickets: summary.totalSeatTickets || 0,
              topEvents: topEvents || [],
              attendanceOverview: attendanceOverview || [],
              ticketTypeBreakdown: ticketTypeBreakdown || [],
              revenueTimeline: revenueTimeline || []
            });
          });
        });
      });
    });
  });
});

app.get('/api/events/:id/seat-map', (req, res) => {
  const { id } = req.params;
  const seatLayout = [
    { id: 'vip', label: 'VIP', start: 1, end: 10, defaultPrice: 5000 },
    { id: 'general', label: 'عام', start: 11, end: 30, defaultPrice: 3000 },
    { id: 'back', label: 'خلفي', start: 31, end: 50, defaultPrice: 2000 }
  ];

  db.get('SELECT id, title, isHybrid, streamUrl, virtualPriceCents FROM events WHERE id = ?', [id], (err, event) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!event) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }

    db.all('SELECT seatNumber FROM tickets WHERE eventId = ? AND isVirtual = 0 AND status = ?', [id, 'paid'], (ticketErr, reservedRows) => {
      if (ticketErr) {
        return res.status(500).json({ error: ticketErr.message });
      }

      const reservedSeats = new Set(reservedRows.filter((row) => Number.isFinite(row.seatNumber)).map((row) => Number(row.seatNumber)));
      const categories = seatLayout.map((category) => ({
        id: category.id,
        label: category.label,
        priceCents: category.defaultPrice,
        seats: Array.from({ length: category.end - category.start + 1 }, (_, index) => {
          const number = category.start + index;
          return { number, reserved: reservedSeats.has(number) };
        })
      }));

      res.json({
        event: {
          id: event.id,
          title: event.title,
          isHybrid: Boolean(event.isHybrid),
          streamUrl: event.streamUrl,
          virtualPriceCents: event.virtualPriceCents || 1500
        },
        seatMap: {
          categories,
          reservedSeats: Array.from(reservedSeats)
        }
      });
    });
  });
});

app.post('/api/events/:id/tickets', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { seatCategory, seatNumber, isVirtual = false, ticketType, priceCents, email, paymentProvider } = req.body;
  let resolvedVirtual = false;

  db.get('SELECT id, title, isHybrid, streamUrl, virtualPriceCents FROM events WHERE id = ?', [id], async (err, event) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!event) {
      return res.status(404).json({ error: 'الفعالية غير موجودة' });
    }

    resolvedVirtual = isVirtual === true || isVirtual === 'true' || isVirtual === 1 || isVirtual === '1';
    if (resolvedVirtual && !event.isHybrid) {
      return res.status(400).json({ error: 'هذه الفعالية لا تدعم البث المباشر.' });
    }

    const seatLayout = {
      vip: { label: 'VIP', start: 1, end: 10, defaultPrice: 5000 },
      general: { label: 'عام', start: 11, end: 30, defaultPrice: 3000 },
      back: { label: 'خلفي', start: 31, end: 50, defaultPrice: 2000 }
    };

    let selectedSeatNumber = null;
    let selectedSeatCategory = seatCategory;
    let selectedTicketType = ticketType || (resolvedVirtual ? 'virtual' : seatCategory || 'general');
    let amountCents = Number(priceCents) || 0;

    const createTicketRecord = async () => {
      const ticketCode = crypto.randomBytes(10).toString('hex');
      const username = req.user.username || null;
      const userId = req.user.id || null;
      const status = 'paid';
      const insertSql = `INSERT INTO tickets (eventId, userId, username, ticketType, priceCents, currency, paymentProvider, status, ticketCode, qrPath, pdfPath, isVirtual, seatNumber, seatCategory, streamUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertParams = [
        event.id,
        userId,
        username,
        selectedTicketType,
        amountCents,
        'usd',
        paymentProvider || 'card',
        status,
        ticketCode,
        null,
        null,
        resolvedVirtual ? 1 : 0,
        selectedSeatNumber,
        selectedSeatCategory,
        resolvedVirtual ? event.streamUrl || null : null
      ];

      db.run(insertSql, insertParams, async function (insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        const ticketId = this.lastID;
        const qrFile = path.join(uploadsDir, `ticket-${ticketId}.png`);
        const pdfFile = path.join(uploadsDir, `ticket-${ticketId}.pdf`);

        try {
          await QRCode.toFile(qrFile, ticketCode, { errorCorrectionLevel: 'M' });
          await generateTicketPdf({
            eventTitle: event.title,
            ticketCode,
            ticketType: selectedTicketType,
            seatCategory: selectedSeatCategory,
            seatNumber: selectedSeatNumber,
            isVirtual: resolvedVirtual
          }, qrFile, pdfFile);

          db.run('UPDATE tickets SET qrPath = ?, pdfPath = ? WHERE id = ?', [qrFile.replace(/\\/g, '/'), pdfFile.replace(/\\/g, '/'), ticketId], (updateErr) => {
            if (updateErr) {
              console.error('Failed to update ticket paths:', updateErr);
            }
          });

          if (mailTransporter && email) {
            try {
              await mailTransporter.sendMail({
                from: process.env.SMTP_FROM || '"فعالية درعا" <no-reply@daraa-events.local>',
                to: email,
                subject: `تذكرتك لحضور ${event.title}`,
                text: `رمز التذكرة: ${ticketCode}`,
                attachments: [{ filename: `ticket-${ticketId}.pdf`, path: pdfFile }]
              });
            } catch (mailErr) {
              console.error('Failed to send ticket email:', mailErr);
            }
          }

          res.status(201).json({
            ticketId,
            ticketCode,
            qrUrl: `/uploads/${path.basename(qrFile)}`,
            pdfUrl: `/uploads/${path.basename(pdfFile)}`,
            eventId: event.id,
            isVirtual: resolvedVirtual,
            seatCategory: selectedSeatCategory,
            seatNumber: selectedSeatNumber,
            streamUrl: event.streamUrl || null,
            priceCents: amountCents,
            currency: 'usd'
          });
        } catch (ticketErr) {
          console.error('Ticket generation failed:', ticketErr);
          return res.status(500).json({ error: 'فشل إنشاء التذكرة.' });
        }
      });
    };

    const checkExistingTicketAndCreate = () => {
      db.get('SELECT id FROM tickets WHERE eventId = ? AND userId = ? AND status IN (\'paid\', \'scanned\') LIMIT 1', [id, req.user.id], (existingErr, existingTicket) => {
        if (existingErr) {
          return res.status(500).json({ error: existingErr.message });
        }
        if (existingTicket) {
          return res.status(409).json({ error: 'لقد حجزت هذه الفعالية بالفعل.' });
        }

        if (resolvedVirtual) {
          return createTicketRecord();
        }
        if (!seatCategory || !seatLayout[seatCategory]) {
          return res.status(400).json({ error: 'يرجى اختيار فئة المقعد الصحيحة.' });
        }
        if (!seatNumber || Number.isNaN(Number(seatNumber))) {
          return res.status(400).json({ error: 'يرجى اختيار رقم المقعد.' });
        }
        selectedSeatNumber = Number(seatNumber);
        const category = seatLayout[seatCategory];
        if (selectedSeatNumber < category.start || selectedSeatNumber > category.end) {
          return res.status(400).json({ error: 'رقم المقعد خارج نطاق الفئة المختارة.' });
        }
        amountCents = amountCents || category.defaultPrice;

        if (!amountCents || amountCents <= 0) {
          return res.status(400).json({ error: 'السعر يجب أن يكون أكبر من صفر.' });
        }

        db.get('SELECT id FROM tickets WHERE eventId = ? AND seatNumber = ? AND isVirtual = 0 AND status = ?', [id, selectedSeatNumber, 'paid'], (seatErr, existing) => {
          if (seatErr) {
            return res.status(500).json({ error: seatErr.message });
          }
          if (existing) {
            return res.status(409).json({ error: 'المقعد محجوز بالفعل. اختر مقعداً آخر.' });
          }
          createTicketRecord();
        });
      });
    };

    checkExistingTicketAndCreate();
  });
});

app.get('/api/tickets/:ticketCode', (req, res) => {
  const { ticketCode } = req.params;
  db.get('SELECT t.*, e.title AS eventTitle FROM tickets t LEFT JOIN events e ON t.eventId = e.id WHERE t.ticketCode = ?', [ticketCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'التذكرة غير موجودة' });
    }
    res.json({
      id: row.id,
      eventId: row.eventId,
      eventTitle: row.eventTitle,
      username: row.username,
      ticketType: row.ticketType,
      paymentProvider: row.paymentProvider || 'card',
      priceCents: row.priceCents,
      currency: row.currency,
      status: row.status,
      ticketCode: row.ticketCode,
      qrUrl: row.qrPath ? row.qrPath.replace(/\\/g, '/') : null,
      pdfUrl: row.pdfPath ? row.pdfPath.replace(/\\/g, '/') : null,
      isVirtual: Boolean(row.isVirtual),
      seatNumber: row.seatNumber,
      seatCategory: row.seatCategory,
      streamUrl: row.streamUrl || null,
      createdAt: row.createdAt
    });
  });
});

app.get('/api/users/me/tickets', requireAuth, (req, res) => {
  db.all(
    `SELECT t.*, e.title AS eventTitle, e.date AS eventDate FROM tickets t
     LEFT JOIN events e ON t.eventId = e.id
     WHERE t.userId = ? ORDER BY e.date ASC, t.createdAt DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        eventTitle: row.eventTitle,
        eventDate: row.eventDate,
        ticketType: row.ticketType,
        paymentProvider: row.paymentProvider || 'card',
        priceCents: row.priceCents,
        currency: row.currency,
        status: row.status,
        ticketCode: row.ticketCode,
        qrUrl: row.qrPath ? row.qrPath.replace(/\\/g, '/') : null,
        pdfUrl: row.pdfPath ? row.pdfPath.replace(/\\/g, '/') : null,
        isVirtual: Boolean(row.isVirtual),
        seatNumber: row.seatNumber,
        seatCategory: row.seatCategory,
        streamUrl: row.streamUrl || null,
        createdAt: row.createdAt
      })));
    }
  );
});

app.get('/api/users/me/history', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  db.all(
    `SELECT t.*, e.title AS eventTitle, e.date AS eventDate,
      CASE WHEN EXISTS (
        SELECT 1 FROM comments c WHERE c.eventId = e.id AND c.username = ?
      ) THEN 1 ELSE 0 END AS reviewed
     FROM tickets t
     LEFT JOIN events e ON t.eventId = e.id
     WHERE t.userId = ? AND t.status IN ('paid', 'scanned') AND date(e.date) <= date(?)
     ORDER BY e.date DESC, t.createdAt DESC`,
    [req.user.username, req.user.id, now],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        eventTitle: row.eventTitle,
        eventDate: row.eventDate,
        ticketType: row.ticketType,
        paymentProvider: row.paymentProvider || 'card',
        priceCents: row.priceCents,
        currency: row.currency,
        status: row.status,
        ticketCode: row.ticketCode,
        qrUrl: row.qrPath ? row.qrPath.replace(/\\/g, '/') : null,
        pdfUrl: row.pdfPath ? row.pdfPath.replace(/\\/g, '/') : null,
        isVirtual: Boolean(row.isVirtual),
        seatNumber: row.seatNumber,
        seatCategory: row.seatCategory,
        streamUrl: row.streamUrl || null,
        reviewed: Boolean(row.reviewed),
        createdAt: row.createdAt
      })));
    }
  );
});

app.post('/api/tickets/:ticketCode/scan', requireAuth, (req, res) => {
  const { ticketCode } = req.params;
  db.get('SELECT t.id, t.status, t.eventId, t.seatCategory, t.seatNumber, t.isVirtual, e.title AS eventTitle FROM tickets t LEFT JOIN events e ON t.eventId = e.id WHERE t.ticketCode = ?', [ticketCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'التذكرة غير موجودة' });
    }
    if (row.status === 'scanned') {
      return res.status(409).json({ error: 'تم استخدام التذكرة بالفعل' });
    }
    db.run('UPDATE tickets SET status = ? WHERE id = ?', ['scanned', row.id], function (updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      res.json({
        ticketCode,
        scanned: true,
        eventId: row.eventId,
        eventTitle: row.eventTitle,
        seatCategory: row.seatCategory,
        seatNumber: row.seatNumber,
        isVirtual: Boolean(row.isVirtual)
      });
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create a Stripe Checkout session for purchasing tickets
app.post('/api/events/:id/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe غير مهيأ. يرجى ضبط المتغير البيئي STRIPE_SECRET_KEY أو إضافة ملف .env بالقيمة الصحيحة.'
    });
  }
  const { id } = req.params;
  const { price_cents, ticket_type = 'general', quantity = 1 } = req.body;

  if (!price_cents || price_cents <= 0) {
    return res.status(400).json({ error: 'يرجى تحديد السعر بالـ cents في الحقل price_cents' });
  }

  db.get('SELECT id, title FROM events WHERE id = ?', [id], async (err, event) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!event) return res.status(404).json({ error: 'الفعالية غير موجودة' });

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: `${event.title} — تذكرة ${ticket_type}` },
              unit_amount: price_cents
            },
            quantity: quantity
          }
        ],
        metadata: {
          eventId: String(id),
          eventTitle: event.title || '',
          ticketType: ticket_type,
          quantity: String(quantity),
          username: req.user ? req.user.username : ''
        },
        success_url: `${APP_URL}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/events/${id}`
      });

      res.json({ url: session.url, id: session.id });
    } catch (stripeErr) {
      console.error('Stripe session create error:', stripeErr);
      res.status(500).json({ error: 'فشل إنشاء جلسة الدفع' });
    }
  });
});

// Stripe webhook endpoint (expects raw body)
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).send('Stripe not configured');
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // If no webhook secret, parse body directly (only for local/dev testing)
      event = req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    const meta = session.metadata || {};
    const eventId = Number(meta.eventId || meta.event_id || 0);
    const ticketType = meta.ticketType || 'general';
    const quantity = Number(meta.quantity || 1);
    const amountTotal = session.amount_total || null;
    const currency = session.currency || 'usd';

    for (let i = 0; i < Math.max(1, quantity); i++) {
      const ticketCode = crypto.randomBytes(10).toString('hex');
      const priceCents = amountTotal ? Math.round(amountTotal / quantity) : 0;
      db.run(`INSERT INTO tickets (eventId, userId, username, ticketType, priceCents, currency, status, ticketCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [eventId, null, meta.username || null, ticketType, priceCents, currency, 'paid', ticketCode], function (insertErr) {
          if (insertErr) {
            console.error('Failed to create ticket record:', insertErr);
            return;
          }

          const ticketId = this.lastID;
          const qrFile = path.join(uploadsDir, `ticket-${ticketId}.png`);
          const pdfFile = path.join(uploadsDir, `ticket-${ticketId}.pdf`);

          // generate QR
          QRCode.toFile(qrFile, ticketCode, { errorCorrectionLevel: 'M' }, async (qrErr) => {
            if (qrErr) console.error('QR generation error:', qrErr);

            // generate PDF with QR embedded
            try {
              const doc = new PDFDocument({ size: 'A6', margin: 20 });
              const stream = fs.createWriteStream(pdfFile);
              doc.pipe(stream);
              doc.fontSize(14).text('تذكرة فعالية', { align: 'center' });
              doc.moveDown();
              doc.fontSize(12).text(`الفعالية: ${meta.eventTitle || ''}`);
              doc.text(`النوع: ${ticketType}`);
              doc.text(`رمز التذكرة: ${ticketCode}`);
              doc.moveDown();
              if (fs.existsSync(qrFile)) {
                doc.image(qrFile, { fit: [150, 150], align: 'center' });
              }
              doc.end();

              stream.on('finish', async () => {
                // update ticket record with paths
                db.run('UPDATE tickets SET qrPath = ?, pdfPath = ? WHERE id = ?', [qrFile.replace(/\\/g, '/'), pdfFile.replace(/\\/g, '/'), ticketId], (updErr) => {
                  if (updErr) console.error('Failed to update ticket paths:', updErr);
                });

                // create payment record
                db.run('INSERT INTO payments (ticketId, provider, providerChargeId, amountCents, currency, status, rawResponse) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [ticketId, 'stripe', session.payment_intent || session.payment_intent_id || session.id, priceCents, currency, 'succeeded', JSON.stringify(session)], (payErr) => {
                    if (payErr) console.error('Failed to insert payment record:', payErr);
                  });

                try {
                  if (mailTransporter && meta.email) {
                    await mailTransporter.sendMail({
                      from: process.env.SMTP_FROM || '"فعالية درعا" <no-reply@daraa-events.local>',
                      to: meta.email,
                      subject: `تذكرتك لحضور ${meta.eventTitle || 'الفعالية'}`,
                      text: `الرمز: ${ticketCode}`,
                      attachments: [{ filename: `ticket-${ticketId}.pdf`, path: pdfFile }]
                    });
                  }
                } catch (mailErr) {
                  console.error('Failed to send ticket email:', mailErr);
                }
              });
            } catch (pdfErr) {
              console.error('PDF generation error:', pdfErr);
            }
          });
        }
      );
    }
  }

  res.json({ received: true });
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
