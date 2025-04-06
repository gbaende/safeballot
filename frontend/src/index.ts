import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const apiUrl = process.env.API_URL || 'http://localhost:8080';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Simple custom renderer without TypeScript errors
app.use((req, res, next) => {
  const originalRender = res.render;
  // @ts-ignore - Ignoring TypeScript errors for Express render function
  res.render = function(view, options = {}) {
    try {
      const layoutPath = path.join(__dirname, '../views/layout.ejs');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      
      // @ts-ignore - Bypassing TypeScript checking for Express internals
      originalRender.call(this, view, options, function(err, html) {
        if (err) throw err;
        const layoutWithBody = layoutContent.replace('<%- body %>', html);
        res.send(layoutWithBody);
      });
    } catch (err) {
      console.error('Error with layout:', err);
      // @ts-ignore - Bypassing TypeScript checking
      originalRender.call(this, view, options);
    }
  };
  next();
});

// API Routes
// @ts-ignore - Ignoring TypeScript error for route handler
app.post('/api/register', (req: Request, res: Response) => {
  try {
    // In a real application, this would validate input and save to a database
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Simulate successful registration
    console.log(`User registered: ${email}`);
    
    // Return success
    return res.json({
      success: true,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration'
    });
  }
});

// @ts-ignore - Ignoring TypeScript error for route handler
app.post('/api/login', (req: Request, res: Response) => {
  try {
    // In a real application, this would validate credentials against a database
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // For demo purposes, accept any valid email/password
    // In a real app, you would check credentials against a database
    
    // Simulate successful login
    console.log(`User logged in: ${email}`);
    
    // Return success with mock token
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: 'sample_jwt_token_' + Date.now(),
        user: {
          email,
          name: email.split('@')[0]
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
});

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'SafeBallot - Vote Outside the Box' });
});

// Auth routes
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - SafeBallot' });
});

app.get('/register', (req, res) => {
  res.render('register', { title: 'Register - SafeBallot' });
});

app.get('/verify', (req, res) => {
  res.render('verify', { title: 'Verify Identity - SafeBallot' });
});

app.get('/verify/id', (req, res) => {
  res.render('verify-id', { title: 'ID Verification - SafeBallot' });
});

app.get('/verify/confirm', (req, res) => {
  res.render('verify-confirm', { title: 'Confirm Information - SafeBallot' });
});

app.get('/verify/success', (req, res) => {
  res.render('verify-success', { title: 'Verification Successful - SafeBallot' });
});

// OTP and Authentication routes
app.get('/otp', (req, res) => {
  res.render('otp', { title: 'Confirm OTP - SafeBallot' });
});

app.get('/voter-id', (req, res) => {
  res.render('voter-id', { title: 'Verify Voter ID - SafeBallot' });
});

app.get('/biometric', (req, res) => {
  res.render('biometric', { title: 'Biometric Verification - SafeBallot' });
});

// Dashboard routes
app.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard - SafeBallot' });
});

app.get('/elections', (req, res) => {
  res.render('elections', { title: 'My Elections - SafeBallot' });
});

app.get('/election/:id', (req, res) => {
  const electionId = req.params.id;
  res.render('election-detail', { 
    title: 'Election Details - SafeBallot',
    electionId
  });
});

app.get('/ballot/new', (req, res) => {
  const step = req.query.step || 1;
  res.render('ballot-builder', { title: 'Create Ballot - SafeBallot', step });
});

app.get('/ballot/:id', (req, res) => {
  const ballotId = req.params.id;
  res.render('ballot', { title: 'Vote - SafeBallot', ballotId });
});

app.get('/ballot/:id/summary', (req, res) => {
  const ballotId = req.params.id;
  res.render('ballot-summary', { title: 'Ballot Summary - SafeBallot', ballotId });
});

app.get('/ballot/:id/confirm', (req, res) => {
  const ballotId = req.params.id;
  res.render('ballot-confirm', { title: 'Confirm Vote - SafeBallot', ballotId });
});

app.get('/ballot/:id/success', (req, res) => {
  const ballotId = req.params.id;
  res.render('ballot-success', { title: 'Vote Successful - SafeBallot', ballotId });
});

// Admin routes
app.get('/manage-voters/:id', (req, res) => {
  const electionId = req.params.id;
  res.render('manage-voters', { 
    title: 'Manage Voters - SafeBallot',
    electionId
  });
});

// Live results route
app.get('/election/:id/results', (req, res) => {
  const electionId = req.params.id;
  res.render('election-results', { 
    title: 'Election Results - SafeBallot',
    electionId
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 