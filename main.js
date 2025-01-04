const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const mongoose = require('mongoose');
const { checkAndPerformDailyUpdates } = require('./middleware/dailyUpdates');
const authRoutes = require('./routes/authRoutes');
const friendRoutes = require('./routes/friendRoutes');
const habitRoutes = require('./routes/habitRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const shopRoutes = require('./routes/shopRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static('uploads'));
app.use(cookieParser());
app.use(session({ secret: "my session secret" }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

checkAndPerformDailyUpdates();

app.use('/', authRoutes);
app.use('/friends', friendRoutes);
app.use('/habits', habitRoutes);
app.use('/challenges', challengeRoutes);
app.use('/shop', shopRoutes);
app.use('/admin', adminRoutes);
app.use('/leaderboard', leaderboardRoutes);

const connectionString = 'mongodb://localhost/Users';
mongoose.connect(connectionString)
  .then(() => console.log(`Successfully connected to ${connectionString}`))
  .catch(err => console.log("Error occurred:\n" + err));

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));