import { expect, test } from '@playwright/test'

test.describe('guest public smoke', () => {
  test('privacy page renders policy content', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page).toHaveTitle(/Privacy Policy/i)
    await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible()
    await expect(page.getByText(/Who We Are/i)).toBeVisible()
  })

  test('terms page renders legal content', async ({ page }) => {
    await page.goto('/terms')

    await expect(page).toHaveTitle(/Terms of Use/i)
    await expect(page.getByRole('heading', { name: /Terms of Use/i })).toBeVisible()
    await expect(page.getByText(/Acceptance/i)).toBeVisible()
  })
})

test.describe('guest 404 handling', () => {
  test('unknown top-level path shows user-friendly 404 page', async ({ page }) => {
    await page.goto('/nonexistent-path-xyz-999')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/404/i)
    await expect(page.getByText(/404 Page Not Found/i)).toBeVisible()
    await expect(page.getByText(/cannot be found/i)).toBeVisible()
  })

  test('fake room ID path shows 404 rather than crashing', async ({ page }) => {
    await page.goto('/nonexistent-room-id-999')
    await page.waitForLoadState('networkidle')

    // The [id] route calls the API; on failure Next.js renders the not-found page
    await expect(page.getByText(/404 Page Not Found/i)).toBeVisible()
    // No unhandled error overlay or raw stack trace should be present
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
    await expect(page.getByText(/Internal Server Error/i)).not.toBeVisible()
  })
})
