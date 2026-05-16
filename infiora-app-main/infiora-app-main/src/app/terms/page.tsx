import type { Metadata } from 'next'
import { Container, Divider, Link, Typography } from '@mui/material'

export const metadata: Metadata = {
  title: 'Terms of Use | Infiora',
  description: 'Terms of Use for the Infiora digital guest guide.',
}

export default function TermsPage() {
  return (
    <Container maxWidth='md' sx={{ py: 6 }}>
      <Typography variant='h4' fontWeight={700} gutterBottom>
        Terms of Use
      </Typography>
      <Typography variant='body2' color='text.secondary' gutterBottom>
        Last updated: 17 April 2026
      </Typography>
      <Divider sx={{ my: 3 }} />

      <Typography variant='h6' fontWeight={600} gutterBottom>
        1. Acceptance
      </Typography>
      <Typography variant='body2' paragraph>
        By accessing this digital guest guide (&quot;the Guide&quot;), you agree to these
        Terms of Use. The Guide is provided by Infiora d.o.o. (&quot;Infiora&quot;) on
        behalf of the hotel you are visiting (&quot;Hotel&quot;).
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        2. Purpose
      </Typography>
      <Typography variant='body2' paragraph>
        The Guide provides information about the Hotel and its services. It allows
        you to browse hotel amenities, submit feedback, and place service requests.
        It is intended for use by hotel guests only.
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        3. Acceptable Use
      </Typography>
      <Typography variant='body2' paragraph>
        You may not: (a) attempt to access systems or data beyond what is provided
        to you; (b) submit false, misleading, or harmful content; (c) use the Guide
        for any unlawful purpose; (d) attempt to reverse-engineer or scrape content
        from the Guide.
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        4. Orders and Service Requests
      </Typography>
      <Typography variant='body2' paragraph>
        Orders and service requests placed through the Guide are fulfilled by the
        Hotel, not by Infiora. Infiora is not responsible for the delivery, quality,
        or outcome of any hotel services. All billing and fulfilment is the Hotel&apos;s
        responsibility.
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        5. Intellectual Property
      </Typography>
      <Typography variant='body2' paragraph>
        The Guide&apos;s software, design, and platform are owned by Infiora. Hotel
        content (photos, descriptions, menus) is owned by the Hotel. You may not
        copy, reproduce, or redistribute any content without written permission.
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        6. Disclaimer of Warranties
      </Typography>
      <Typography variant='body2' paragraph>
        The Guide is provided &quot;as is.&quot; Infiora and the Hotel do not warrant
        that the Guide will be uninterrupted, error-free, or that any information
        displayed is accurate at all times. Hotel information (prices, availability,
        hours) may change without notice.
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        7. Limitation of Liability
      </Typography>
      <Typography variant='body2' paragraph>
        To the maximum extent permitted by law, neither Infiora nor the Hotel shall
        be liable for indirect, incidental, or consequential damages arising from
        your use of the Guide.
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        8. Governing Law
      </Typography>
      <Typography variant='body2' paragraph>
        These Terms are governed by the laws of the Republic of Croatia. Any
        disputes shall be subject to the exclusive jurisdiction of Croatian courts.
      </Typography>

      <Typography variant='h6' fontWeight={600} gutterBottom>
        9. Contact
      </Typography>
      <Typography variant='body2'>
        Infiora d.o.o., Croatia {'|'} <Link href='mailto:legal@infiora.hr'>legal@infiora.hr</Link>
      </Typography>
    </Container>
  )
}
