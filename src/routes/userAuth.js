import { Router } from 'express';
import { resolvers } from '../resolvers/resolvers.js';
import { getUserWithPreferences } from '../utils/getUserWithPreferences.js'

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
     const fullUser = await getUserWithPreferences(user.id)

    req.session.user = {
      id: fullUser.id,
      email: fullUser.email,
      preferences: fullUser.strains, // can rename on client if needed
    }

    req.session.save(() => {
      res.status(200).json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(401).json({ success: false, error: err.message });
  }
});


router.get('/me', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }

  try {
    const fullUser = await getUserWithPreferences(req.session.user.id)

    res.json({
      success: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        preferences: fullUser.strains,
      },
    })
  } catch (err) {
    console.error('❌ Error fetching /me:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch user' })
  }
})

router.post('/logout', async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Logout error:', err)
      return res.status(500).json({ success: false, error: 'Logout failed' })
    }
    res.clearCookie('connect.sid')
    res.json({ success: true })
  })
})

export default router;
