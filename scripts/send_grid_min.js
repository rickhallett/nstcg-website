// // using Twilio SendGrid's v3 Node.js Library
// // https://github.com/sendgrid/sendgrid-nodejs
// import { compileActivationEmail } from './compile-email.js';
// import dotenv from 'dotenv';
// dotenv.config();
// import sgMail from '@sendgrid/mail'
// sgMail.setApiKey(process.env.SENDGRID_API_KEY)
// // sgMail.setDataResidency('eu'); 
// // uncomment the above line if you are sending mail using a regional EU subuser

// const testData = {
//   user_email: encodeURIComponent('test@example.com'),
//   bonus: '75'
// };

// const { html, errors } = compileActivationEmail('kai@oceanheart.ai', 75);

// const msg = {
//   to: 'kai@oceanheart.ai',
//   from: 'info@nstcg.org',
//   subject: 'Sending with SendGrid is Fun',
//   html: html,
// }

// sgMail
//   .send(msg)
//   .then(() => {
//     console.log('Email sent')
//   })
//   .catch((error) => {
//     console.error(JSON.stringify(error, null, 2))
//   })

// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv';
dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
// sgMail.setDataResidency('eu'); 
// uncomment the above line if you are sending mail using a regional EU subuser

const msg = {
  to: 'kai@oceanheart.ai', // Change to your recipient
  from: 'engineering@nstcg.org', // Change to your verified sender
  subject: 'Sending with SendGrid is Fun',
  text: 'and easy to do anywhere, even with Node.js',
  html: '<strong>and easy to do anywhere, even with Node.js</strong>',
}
sgMail
  .send(msg)
  .then(() => {
    console.log('Email sent')
  })
  .catch((error) => {
    console.error(error)
  })