const { Resend } = require('resend');

module.exports = {
  sendMail: async ({ to, subject, html }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY env var is not set on the server.');
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'FreshMart <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    return data;
  },
};
