// Create Stripe checkout session for donations
import { requireFeature } from './middleware/feature-flags.js';

export default async function handler(req, res) {
  // Check if donations feature is enabled
  if (await requireFeature('donations.enabled')(req, res) !== true) {
    return; // Response already sent by middleware
  }
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { amount, name, email, message, user_id } = req.body;
    
    // Validation
    if (!amount || amount < 100 || amount > 100000) {
      return res.status(400).json({ error: 'Invalid amount. Must be between £1 and £1000.' });
    }
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    // Initialize Stripe with the secret key
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Stripe secret key not configured');
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'NSTCG Campaign Donation',
            description: 'Supporting safer streets in North Swanage',
            images: ['https://nstcg.org/images/logo.png'], // Add logo if available
          },
          unit_amount: amount, // Amount in pence
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.SITE_URL || 'https://nstcg.org'}/donate.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'https://nstcg.org'}/donate.html?canceled=true`,
      metadata: {
        donor_name: name.trim(),
        donor_email: email.trim(),
        message: message ? message.trim().substring(0, 500) : '', // Limit message length
        user_id: user_id || '',
        timestamp: new Date().toISOString(),
      },
      // Additional options
      submit_type: 'donate',
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: false,
      },
    });
    
    // Return session ID for client-side redirect
    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
    
  } catch (error) {
    console.error('Stripe error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: 'Card error: ' + error.message });
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid request: ' + error.message });
    } else if (error.type === 'StripeAPIError') {
      return res.status(500).json({ error: 'Stripe API error. Please try again.' });
    } else if (error.type === 'StripeConnectionError') {
      return res.status(500).json({ error: 'Network error. Please check your connection.' });
    } else if (error.type === 'StripeAuthenticationError') {
      console.error('Stripe authentication failed - check API keys');
      return res.status(500).json({ error: 'Payment system configuration error' });
    }
    
    // Generic error
    res.status(500).json({ 
      error: 'Failed to create checkout session. Please try again.' 
    });
  }
}