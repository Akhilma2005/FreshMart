const { Resend } = require('resend');
const resend = new Resend('re_4iL6Reiz_LRfX6dGK4iWSvNzmeNKwPaJS');
resend.emails.send({
  from: 'FreshMart <onboarding@resend.dev>',
  to: 'someother@gmail.com',
  subject: 'FreshMart OTP Test',
  html: '<p>Your OTP is 123456</p>',
}).then(r => console.log(JSON.stringify(r))).catch(e => console.error(e.message));
