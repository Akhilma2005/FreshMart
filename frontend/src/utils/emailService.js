import emailjs from '@emailjs/browser';

const SERVICE_ID  = 'service_4ij8jfn';
const TEMPLATE_ID = '4qo7ic1';
const PUBLIC_KEY  = 'IEFD7tVDSCValq0E_';

export const sendOTPEmail = (toEmail, otp) =>
  emailjs.send(SERVICE_ID, TEMPLATE_ID, { email: toEmail, passcode: otp }, PUBLIC_KEY);
