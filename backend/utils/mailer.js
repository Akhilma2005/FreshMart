const nodemailer = require('nodemailer');

const getTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

module.exports = {
  sendMail: (options) => {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      return Promise.reject(new Error('MAIL_USER and MAIL_PASS env vars are not set on the server.'));
    }
    return getTransporter().sendMail(options);
  },
};
