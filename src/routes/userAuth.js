import { Router } from 'express';
import { resolvers } from '../resolvers/resolvers.js';

const router = Router();

router.post('/signup', async (req, res) => {
  console.log('🔐 User signup attempt:', req.body);
  const { email, password } = req.body;

  try {
    const user = await resolvers.Mutation.signup(null, { email, password });
    console.log('✅ User signed up successfully:', user.email);

    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name || null,
    };

    req.session.save(() => {
      res.status(201).json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error('❌ Signup error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});



router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await resolvers.Mutation.login(null, { email, password });

    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name || null,
    };

    req.session.save(() => {
      res.status(200).json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(401).json({ success: false, error: err.message });
  }
});


router.get('/me', (req, res) => {
  console.log('🧪 SESSION on /auth/me:', req.session);

  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, error: 'Not authenticated' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ success: true });
  });
});

export default router;
