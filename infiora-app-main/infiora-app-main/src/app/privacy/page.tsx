import type { Metadata } from 'next'
import { Box, Container, Divider, Link, Typography } from '@mui/material'

export const metadata: Metadata = {
  title: 'Privacy Policy | Infiora',
  description: 'How Infiora and partner hotels handle your data.',
}

export default function PrivacyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Privacy Policy
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Last updated: 17 April 2026
      </Typography>
      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" fontWeight={600} gutterBottom>1. Who We Are</Typography>
      <Typography variant="body2" paragraph>
        This digital guest guide is powered by <strong>Infiora</strong> on behalf of the hotel you are currently visiting. Infiora acts as a data processor; the hotel acts as the data controller for your personal data.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>2. What We Collect and Why</Typography>
      <Typography variant="body2" paragraph>
        <strong>Browser language and device type</strong> — Collected automatically to display content in your preferred language and optimise the layout for your device. This is necessary to provide the service (legitimate interest, GDPR Art. 6(1)(f)). Not linked to your identity.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Session identifier</strong> — A random ID is created for your current browser session to count unique visitors. It is stored in session storage and deleted automatically when you close the tab. It cannot identify you personally.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Time spent on page</strong> — Approximate time on this guide is recorded as an anonymous number to help the hotel improve its content. Not linked to your identity.
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Feedback and email (optional)</strong> — If you submit a rating or written feedback, that data is stored by the hotel. If you voluntarily provide your email and give explicit consent, it may be used to respond to your feedback. You can request deletion at any time (see Section 5).
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Orders</strong> — If you place an order, your room number and order details are processed to fulfil it. This is necessary for the performance of a service you requested (GDPR Art. 6(1)(b)).
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>3. Third-Party Services</Typography>
      <Typography variant="body2" paragraph>
        We use the following sub-processors:
      </Typography>
      <Box component="ul" sx={{ pl: 3, mb: 2 }}>
        <Typography variant="body2" component="li">
          <strong>Google Cloud Translation API</strong> — Translates content into your language. No personal data is sent.
        </Typography>
        <Typography variant="body2" component="li">
          <strong>Amazon Web Services (AWS S3)</strong> — Stores hotel images. GDPR-compliant certified sub-processor.
        </Typography>
      </Box>

      <Typography variant="h6" fontWeight={600} gutterBottom>4. How Long We Keep Your Data</Typography>
      <Typography variant="body2" paragraph>
        Anonymous usage data (views, taps, time spent) is automatically deleted after 2 years. Feedback and order data is retained for the period necessary to manage your stay, after which it is deleted. You may request earlier deletion (see below).
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>5. Your Rights</Typography>
      <Typography variant="body2" paragraph>
        Under the GDPR you have the right to access, correct, delete, or export personal data we hold about you. Contact the hotel directly or email: <strong>privacy@infiora.hr</strong>. We will respond within 30 days.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>6. No Cookie Banner</Typography>
      <Typography variant="body2" paragraph>
        This guide does not use cookies or persistent tracking. The session identifier used for anonymous analytics is stored in session storage (not cookies) and is deleted automatically when you close the tab. No consent banner is required.
      </Typography>

      <Typography variant="h6" fontWeight={600} gutterBottom>7. Contact</Typography>
      <Typography variant="body2">
        Data Controller: The hotel you are visiting.<br />
        Data Processor: Infiora d.o.o., Croatia.<br />
        Privacy enquiries: <Link href="mailto:privacy@infiora.hr">privacy@infiora.hr</Link>
      </Typography>
    </Container>
  )
}
