const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

module.exports = {
  sendMail: async ({ to, subject, html }) => {
    if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
      throw new Error('BREVO_USER and BREVO_PASS env vars are not set.');
    }
    await transporter.sendMail({
      from: '"FreshMart" <maakhil432005@gmail.com>',
      to,
      subject,
      html,
    });
  },
};
