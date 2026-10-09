import express from 'express';
import * as localDb from '../storage/database/local-db';
import { signToken } from './jwt';
import { generateCode, storeCode, verifyCode } from './codes';

const PHONE_RE = /^1[3-9]\d{9}$/;

export const authRouter = express.Router();

authRouter.post('/send-code', (req, res) => {
  const { phone } = req.body || {};
  if (!phone || !PHONE_RE.test(phone)) {
    return res.status(400).json({ code: 400, msg: '手机号格式不正确' });
  }

  const code = generateCode();
  storeCode(phone, code);
  console.log(`[Auth] Verification code for ${phone}: ${code}`);

  const data: Record<string, any> = { expiresIn: 300 };
  if (process.env.NODE_ENV !== 'production') {
    data.devCode = code;
  }
  res.json({ code: 200, msg: '验证码已发送', data });
});

authRouter.post('/login', (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ code: 400, msg: '手机号和验证码不能为空' });
  }
  if (!verifyCode(phone, code)) {
    return res.status(400).json({ code: 400, msg: '验证码错误或已过期' });
  }

  let user = localDb.getUserByPhone(phone);
  const isNew = !user;
  if (isNew) {
    user = localDb.createUser(phone);
  }

  const onboarded = user.onboarded === 1;
  const token = signToken({ userId: user.id, phone });
  res.json({ code: 200, data: { token, user, isNew, onboarded } });
});
