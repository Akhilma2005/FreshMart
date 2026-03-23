const nodemailer = require('nodemailer');

module.exports = {
  sendMail: async ({ to, subject, html }) => {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error('MAIL_USER and MAIL_PASS env vars are not set on the server.');
    }
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"FreshMart" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
  },
};
