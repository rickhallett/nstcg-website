// Stripe webhook handler for processing successful donations
import { Client } from '@notionhq/client';
import { requireFeature } from '../middleware/feature-flags.js';

// Buffer raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // Check if donations feature is enabled
  if (await requireFeature('donations.enabled')(req, res) !== true) {
    return; // Response already sent by middleware
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  
  // Get raw body for signature verification
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      try {
        // Get full session details with line items
        const fullSession = await stripe.checkout.sessions.retrieve(
          session.id,
          { expand: ['line_items'] }
        );
        
        const amount = fullSession.amount_total / 100; // Convert from pence to pounds
        
        // Calculate points (5x the amount donated)
        const points = amount * 5;
        
        // Store donation in Notion
        const donationRecord = await notion.pages.create({
          parent: { database_id: process.env.NOTION_DONATIONS_DB_ID },
          properties: {
            'Donation ID': { 
              title: [{ text: { content: session.id } }] 
            },
            'Amount': { 
              number: amount 
            },
            'Donor Name': { 
              rich_text: [{ text: { content: session.metadata.donor_name || 'Anonymous' } }] 
            },
            'Donor Email': { 
              email: session.metadata.donor_email 
            },
            'Message': { 
              rich_text: [{ text: { content: session.metadata.message || '' } }] 
            },
            'Points Awarded': { 
              number: points 
            },
            'User ID': { 
              rich_text: [{ text: { content: session.metadata.user_id || '' } }] 
            },
            'Status': { 
              select: { name: 'Completed' } 
            },
            'Timestamp': { 
              date: { start: new Date().toISOString() } 
            },
            'Payment Intent': {
              rich_text: [{ text: { content: session.payment_intent } }]
            }
          }
        });
        
        console.log(`Donation processed: £${amount} from ${session.metadata.donor_email}, ${points} points awarded`);
        
        // Update user points if user_id exists
        if (session.metadata.user_id) {
          await updateUserPoints(
            notion,
            session.metadata.user_id, 
            points,
            session.metadata.donor_email
          );
        }
        
        // Send confirmation email (future enhancement)
        // await sendDonationConfirmationEmail(session.metadata.donor_email, amount, points);
        
      } catch (error) {
        console.error('Error processing donation:', error);
        // Don't return error - Stripe will retry webhook
        // Log to monitoring service
      }
      break;
      
    case 'checkout.session.expired':
      // Log expired sessions for analytics
      console.log('Checkout session expired:', event.data.object.id);
      break;
      
    case 'payment_intent.payment_failed':
      // Log failed payments for follow-up
      console.log('Payment failed:', event.data.object.id);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  // Return 200 to acknowledge receipt of the event
  res.status(200).json({ received: true });
}

// Update user's total points
async function updateUserPoints(notion, userId, pointsToAdd, email) {
  if (!process.env.NOTION_DATABASE_ID) {
    console.log('User database not configured, skipping points update');
    return;
  }
  
  try {
    // First, try to find user by user_id
    let userQuery = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'User ID',
        rich_text: { equals: userId }
      },
      page_size: 1
    });
    
    // If not found by user_id, try by email
    if (userQuery.results.length === 0 && email) {
      userQuery = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
          property: 'Email',
          email: { equals: email }
        },
        page_size: 1
      });
    }
    
    if (userQuery.results.length > 0) {
      const userPage = userQuery.results[0];
      const currentPoints = userPage.properties['Points']?.number || 0;
      const newTotal = currentPoints + pointsToAdd;
      
      // Update user's points
      await notion.pages.update({
        page_id: userPage.id,
        properties: {
          'Points': { number: newTotal },
          'Last Donation': { date: { start: new Date().toISOString() } }
        }
      });
      
      console.log(`Updated user ${userId} points: ${currentPoints} + ${pointsToAdd} = ${newTotal}`);
    } else {
      console.log(`User not found for points update: ${userId} / ${email}`);
    }
  } catch (error) {
    console.error('Error updating user points:', error);
  }
}