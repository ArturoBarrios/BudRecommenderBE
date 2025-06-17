import { Router } from 'express';
import { resolvers } from '../resolvers/resolvers.js';


const router = Router();

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await resolvers.Mutation.signup(null, { email, password });
    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('❌ Signup error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await resolvers.Mutation.login(null, { email, password });
    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(401).json({ success: false, error: err.message });
  }
});

export default router;
