import { Resend } from 'resend'

// Handle missing API key during build
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Resend free tier only allows sending to verified email addresses
const VERIFIED_EMAIL = 'krishnareddy11082003@gmail.com'

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`

  // Always log verification URL for development convenience
  console.log('\n🔗 EMAIL VERIFICATION URL:')
  console.log(`📧 To: ${email}`)
  console.log(`🔗 URL: ${verificationUrl}`)
  console.log('📝 Copy this URL to your browser to verify the email\n')

  // If no Resend configured, just log and return
  if (!resend) {
    console.log('ℹ️  Resend API key not configured - email logged above for development')
    return null
  }

  // For Resend free tier, only send to verified email address
  // For all other emails, just log the URL (which is sufficient for development)
  if (email !== VERIFIED_EMAIL) {
    console.log(`ℹ️  Email address ${email} not in verified list - verification URL logged above`)
    console.log(`💡 To test email delivery, use ${VERIFIED_EMAIL} or verify your domain on Resend`)
    return null
  }

  try {
    console.log(`📤 Sending verification email to verified address: ${email}`)
    
    const { data, error } = await resend.emails.send({
      from: 'QuickIntell <onboarding@resend.dev>',
      to: [email],
      subject: 'Welcome aboard, QuickIntell!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Welcome to QuickIntell</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome aboard, QuickIntell!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #333; margin-top: 0; font-size: 20px;">Hi ${firstName},</h2>
              
              <p style="margin-bottom: 20px;">We are so excited that you have chosen to use <strong>QuickIntell</strong> for your email marketing needs. To enable email campaigns and warm-up on any email address, simply add it to your dashboard using the "Connect Mailbox" button.</p>
              
              <p style="margin-bottom: 20px;">We understand it may be a bit early to ask, but if you could let others know about QuickIntell through a review, that would be great.</p>
              
              <p style="margin-bottom: 20px; font-style: italic; color: #666;">In the rare event that this email ended up in your spam folder, please move it to your inbox and add it to your whitelist.</p>
              
              <p style="margin-bottom: 30px; font-weight: 600;">There's just one more small step: please click the button below to verify your email address.</p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 3px 6px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="margin-bottom: 20px;">At <strong>QuickScribe LLC</strong> (the company behind QuickIntell), we are always working to improve and be better than we were yesterday.</p>
              
              <p style="margin-bottom: 30px;">As a way of thanking our most trusted customers, we sometimes offer free giveaways of our other SaaS products through elaborate reviews.</p>
              
              <p style="margin-bottom: 20px; font-style: italic; color: #666;">If you haven't created an account yet, no further action is required.</p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <!-- Fallback URL -->
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                <strong>If you're having trouble clicking the "Verify Email Address" button,</strong> copy and paste the URL below into your web browser:
              </p>
              <p style="word-break: break-all; color: #667eea; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #667eea;">
                ${verificationUrl}
              </p>
              
              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                <p style="font-size: 12px; color: #999; margin: 0;">
                  This email was sent by QuickScribe LLC<br>
                  If you didn't create an account with us, please ignore this email.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      console.log('🔗 Verification URL is still available above for manual testing')
      // Don't throw error - just log it and continue
      return null
    }

    console.log('✅ Verification email sent successfully!')
    return data
  } catch (error) {
    console.error('Email sending error:', error)
    console.log('🔗 Verification URL is still available above for manual testing')
    // Don't throw error in development - just log it
    return null
  }
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // Always log reset URL for development convenience
  console.log('\n🔗 PASSWORD RESET URL:')
  console.log(`📧 To: ${email}`)
  console.log(`🔗 URL: ${resetUrl}`)
  console.log('📝 Copy this URL to your browser to reset the password\n')

  if (!resend) {
    console.log('ℹ️  Resend API key not configured - reset URL logged above for development')
    return null
  }

  // For Resend free tier, only send to verified email address
  if (email !== VERIFIED_EMAIL) {
    console.log(`ℹ️  Email address ${email} not in verified list - reset URL logged above`)
    return null
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'QuickIntell <onboarding@resend.dev>',
      to: [email],
      subject: 'Reset your QuickIntell password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: #667eea; padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Password Reset Request</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #333; margin-top: 0; font-size: 20px;">Hi ${firstName},</h2>
              
              <p style="margin-bottom: 20px;">You requested to reset your password for your QuickIntell account. Click the button below to set a new password:</p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" style="background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 3px 6px rgba(102, 126, 234, 0.3);">
                  Reset Password
                </a>
              </div>
              
              <p style="margin-bottom: 20px; font-weight: 600; color: #d63384;">This link will expire in 1 hour for security purposes.</p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <!-- Fallback URL -->
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="word-break: break-all; color: #667eea; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #667eea;">
                ${resetUrl}
              </p>
              
              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #666;">
                  If you didn't request this password reset, please ignore this email or 
                  <a href="mailto:support@quickintell.com" style="color: #667eea;">contact our support team</a>.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      console.log('🔗 Reset URL is still available above for manual testing')
      return null
    }

    console.log('✅ Password reset email sent successfully!')
    return data
  } catch (error) {
    console.error('Email sending error:', error)
    console.log('🔗 Reset URL is still available above for manual testing')
    return null
  }
} 