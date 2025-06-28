import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const msg = {
  to: 'kai@oceanheart.ai',
  from: 'engineering@nstcg.org',
  templateId: 'd-24401dab58ec4e9eb158de7034e307fe',
  dynamic_template_data: {
    email: 'kai@oceanheart.ai',
  },
};
sgMail.send(msg).then(() => {
  console.log('Email sent');
}).catch((error) => {
  console.error(JSON.stringify(error, null, 2));
});