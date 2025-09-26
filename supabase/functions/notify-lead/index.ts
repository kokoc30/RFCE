import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const TO_EMAIL = Deno.env.get('TO_EMAIL');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL');

    if (!RESEND_API_KEY || !TO_EMAIL || !FROM_EMAIL) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { name, email, phone, message, preferred_date, preferred_time, source } = await req.json();

    // Build email content
    const isTourLead = source === 'tour' && preferred_date && preferred_time;
    const subject = isTourLead 
      ? `New Tour Booking: ${name}` 
      : `New Contact Form Submission: ${name}`;

    const textContent = `
New ${isTourLead ? 'Tour Booking' : 'Contact Form Submission'} from RFCE Website

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

${isTourLead ? `Preferred Tour Date: ${preferred_date}
Preferred Tour Time: ${preferred_time}` : ''}

Message:
${message}

${isTourLead ? 'This is a tour booking request. Please follow up to confirm the appointment.' : 'Please respond to this inquiry promptly.'}

---
Sent from RFCE Senior Living Community Contact Form
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #6b8e6b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">RFCE Senior Living Community</h1>
    <h2 style="margin: 10px 0 0 0; font-size: 18px; font-weight: normal;">
      ${isTourLead ? 'New Tour Booking Request' : 'New Contact Form Submission'}
    </h2>
  </div>
  
  <div style="background-color: #f8f6f3; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
        <td style="padding: 8px 0;">${name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Email:</td>
        <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #6b8e6b;">${email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
        <td style="padding: 8px 0;">${phone ? `<a href="tel:${phone}" style="color: #6b8e6b;">${phone}</a>` : 'Not provided'}</td>
      </tr>
      ${isTourLead ? `
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Tour Date:</td>
        <td style="padding: 8px 0; color: #6b8e6b; font-weight: bold;">${preferred_date}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Tour Time:</td>
        <td style="padding: 8px 0; color: #6b8e6b; font-weight: bold;">${preferred_time}</td>
      </tr>
      ` : ''}
    </table>
    
    <div style="margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #6b8e6b;">Message:</h3>
      <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #6b8e6b;">
        ${message.replace(/\n/g, '<br>')}
      </div>
    </div>
    
    ${isTourLead ? `
    <div style="margin-top: 20px; padding: 15px; background-color: #e8f5e8; border-radius: 6px; border: 1px solid #6b8e6b;">
      <strong style="color: #6b8e6b;">⚠️ Action Required:</strong> This is a tour booking request. Please follow up to confirm the appointment.
    </div>
    ` : `
    <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 6px; border: 1px solid #ffc107;">
      <strong style="color: #856404;">📧 Follow Up:</strong> Please respond to this inquiry promptly.
    </div>
    `}
  </div>
  
  <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
    <p>Sent from RFCE Senior Living Community Contact Form</p>
    <p><a href="https://rfce.com" style="color: #6b8e6b;">Visit our website</a></p>
  </div>
</body>
</html>
    `.trim();

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: subject,
        text: textContent,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email notification', details: errorText }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});