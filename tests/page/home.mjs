// The home page. An error it throws, or writes to its console, fails the part it came in.
import { group } from "../../crux/chrome/harness.ts";

const test = group("home", { covers: ["src"], why: "a page's errors show only as it runs" });

test("it opens with no error in it", async ({ page }) => {
  await page.locator("h1").waitFor();
});
