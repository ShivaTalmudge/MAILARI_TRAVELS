export const generateEmailHtml = (title: string, body: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #F7F4EC; margin: 0; padding: 0; color: #171717; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #11110F; padding: 30px 40px; text-align: center; }
    .header h1 { color: #D9B76A; margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 40px; }
    .content h2 { color: #171717; font-size: 20px; margin-top: 0; }
    .content p { font-size: 16px; line-height: 1.6; color: #524E46; margin-bottom: 20px; }
    .button { display: inline-block; background-color: #C9A45C; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: 600; font-size: 16px; }
    .footer { background-color: #E9E5DC; padding: 30px 40px; text-align: center; font-size: 14px; color: #6F6A60; }
    .footer a { color: #99742B; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mailari Travels</h1>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Mailari Travels. All rights reserved.</p>
      <p>123 Travel Hub, Pune, Maharashtra 411001</p>
      <p><a href="mailto:support@mailaritravels.com">support@mailaritravels.com</a> | +91 90000 00000</p>
    </div>
  </div>
</body>
</html>
`;

export const templates = {
  customerWelcome: (name: string) => generateEmailHtml(
    'Welcome to Mailari Travels',
    `<h2>Hello ${name},</h2>
     <p>Welcome to Mailari Travels! We are thrilled to have you on board.</p>
     <p>You can now book outstation cabs, local rentals, and airport transfers with verified drivers and transparent pricing.</p>
     <p><a href="https://mailaritravels.com/login" class="button">Log in to your account</a></p>`
  ),
  
  emailVerification: (name: string, token: string) => generateEmailHtml(
    'Verify your Email',
    `<h2>Hello ${name},</h2>
     <p>Please verify your email address to secure your Mailari Travels account.</p>
     <p><a href="https://mailaritravels.com/verify?token=${token}" class="button">Verify Email</a></p>
     <p>If you did not create this account, please ignore this email.</p>`
  ),
  
  passwordReset: (name: string, token: string) => generateEmailHtml(
    'Reset your Password',
    `<h2>Hello ${name},</h2>
     <p>We received a request to reset your password. Click the button below to choose a new password.</p>
     <p><a href="https://mailaritravels.com/reset-password?token=${token}" class="button">Reset Password</a></p>
     <p>This link expires in 30 minutes. If you did not request this, please ignore this email.</p>`
  ),
  
  bookingReceived: (name: string, bookingNumber: string, details: any) => generateEmailHtml(
    'Booking Request Received',
    `<h2>Hello ${name},</h2>
     <p>We have received your booking request (<strong>${bookingNumber}</strong>).</p>
     <p><strong>Pickup:</strong> ${details.pickupDate} at ${details.pickupTime}</p>
     <p><strong>From:</strong> ${details.pickupLocation}</p>
     <p>Our team is reviewing your request and will assign a driver shortly.</p>
     <p><a href="https://mailaritravels.com/customer/bookings/${bookingNumber}" class="button">View Booking</a></p>`
  ),
  
  bookingConfirmed: (name: string, bookingNumber: string, amount: string) => generateEmailHtml(
    'Booking Confirmed',
    `<h2>Hello ${name},</h2>
     <p>Great news! Your booking <strong>${bookingNumber}</strong> is confirmed.</p>
     <p>The total estimated fare is ${amount}. You can track your trip from your dashboard.</p>
     <p><a href="https://mailaritravels.com/customer/bookings/${bookingNumber}" class="button">View Booking details</a></p>`
  ),

  paymentReceived: (name: string, bookingNumber: string, amount: string, receipt: string) => generateEmailHtml(
    'Payment Received',
    `<h2>Hello ${name},</h2>
     <p>We have successfully received your payment of <strong>${amount}</strong> for booking ${bookingNumber}.</p>
     <p>Transaction Reference: ${receipt}</p>
     <p>Thank you for choosing Mailari Travels.</p>`
  ),
  
  invoiceGenerated: (name: string, invoiceNumber: string, bookingNumber: string) => generateEmailHtml(
    'Your Invoice is Ready',
    `<h2>Hello ${name},</h2>
     <p>Your invoice (<strong>${invoiceNumber}</strong>) for booking ${bookingNumber} has been generated.</p>
     <p>You can view and download the PDF invoice from your dashboard.</p>
     <p><a href="https://mailaritravels.com/customer/invoices" class="button">View Invoice</a></p>`
  )
};
