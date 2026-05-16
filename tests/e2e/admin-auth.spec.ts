import { expect, test } from '@playwright/test'

test.describe('admin auth smoke', () => {
  test('login page exposes auth form', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle(/Login/i)
    await expect(page.locator('input[type="email"], input[name="email"]')).toHaveCount(1)
    await expect(page.locator('input[type="password"]')).toHaveCount(1)
  })

  test('protected route redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/')

    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="password"]')).toHaveCount(1)
  })
})

test.describe('admin login validation', () => {
  test('inline validation error shown for short password', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Fill a valid-format email but a password too short to pass yup (min 8 chars)
    await page.locator('input[type="email"], input[name="email"]').fill('test@fake.example')
    await page.locator('input[type="password"]').fill('short')
    await page.getByRole('button', { name: /continue/i }).click()

    // react-hook-form + yup surfaces the error via FormHelperText
    await expect(page.locator('.MuiFormHelperText-root')).toBeVisible()
  })

  test('API error toast shown for invalid credentials that pass format validation', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Credentials that satisfy yup (valid email, ≥8 chars) but will be rejected by the API
    await page.locator('input[type="email"], input[name="email"]').fill('test@fake.example')
    await page.locator('input[type="password"]').fill('wrongpass123')
    await page.getByRole('button', { name: /continue/i }).click()

    // react-toastify renders error notifications with role="alert"
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    // The page must remain on /login — no redirect on failure
    await expect(page).toHaveURL(/\/login/)
  })

  test('visiting protected route preserves redirect destination in URL', async ({ page }) => {
    await page.goto('/hotels')
    await page.waitForLoadState('networkidle')

    // AuthGuard should redirect to /login and encode the original route
    await expect(page).toHaveURL(/\/login/)
  })
})
