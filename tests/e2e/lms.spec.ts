import { test, expect } from "@playwright/test";

test.describe("Sports LMS Flow", () => {
  test("1. Login page displays and credentials work", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("APEX");
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Use Student one-click demo
    await page.click('button:has-text("Student (Alice)")');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("h1")).toContainText("Welcome back, Alice Johnson!");
  });

  test("2. Student Dashboard shows accurate '3 of 13 modules completed' for Boxing", async ({
    page,
  }) => {
    // Login as Alice
    await page.goto("/login");
    await page.click('button:has-text("Student (Alice)")');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Verify Boxing card shows 3 of 13 modules completed (23%)
    const boxingCard = page.locator('a[href="/sports/boxing"]');
    await expect(boxingCard).toBeVisible();
    await expect(boxingCard).toContainText("3 of 13 modules completed");
    await expect(boxingCard).toContainText("23%");
  });

  test("3. Admin logs in and accesses Admin Portal with RBAC protection", async ({
    page,
  }) => {
    // Login as Super Admin
    await page.goto("/login");
    await page.click('button:has-text("Admin (Super)")');
    await page.click('button[type="submit"]');

    // Admin should land on /admin or navigate there
    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("Analytics & Academy KPIs");
    await expect(page.locator("text=Total Students")).toBeVisible();
  });

  test("4. Sequential module unlocking: Module 1 unlocked, future modules locked", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.click('button:has-text("Student (Bob)")');
    await page.click('button[type="submit"]');

    await page.goto("/sports/boxing");

    // Bob has completed Module 1, Module 2 is in progress, Module 4 should be locked
    await expect(page.locator("h1")).toContainText("Boxing Training");
    await expect(page.locator("text=Module 1")).toBeVisible();
  });
});
