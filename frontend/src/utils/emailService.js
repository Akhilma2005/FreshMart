import emailjs from '@emailjs/browser';

const SERVICE_ID  = 'service_dftcyir';
const TEMPLATE_ID = 'template_lhvikdf';
const PUBLIC_KEY  = 'IEFD7tVDSCValq0E_';

export const sendOTPEmail = async (toEmail, otp) => {
  const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, { email: toEmail, passcode: otp }, PUBLIC_KEY);
  console.log('EmailJS result:', result);
  return result;
};
