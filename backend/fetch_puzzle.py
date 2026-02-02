import os
import sys
import time
import subprocess
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def fetch_and_parse(puzzle_id):
    # 1. Setup Paths
    base_dir = f"parse/puzzles/puzzle-{puzzle_id}"
    html_filename = f"{base_dir}/puzzle-{puzzle_id}.html"
    json_output = f"{base_dir}/puzzle-{puzzle_id}-data.json"
    
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        print(f"Created directory: {base_dir}")

    # 2. Browser Automation
    options = webdriver.ChromeOptions()
    # options.add_argument('--headless') # Uncomment to run in background
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 15)

    try:
        url = f"https://www.crosserville.com/CrossWordPuzzleBook/puzzle{puzzle_id}"
        print(f"Navigating to {url}...")
        driver.get(url)

        # --- STEP 1: Switch to Iframe ---
        print("Locating iframe...")
        iframe = wait.until(EC.presence_of_element_located((By.TAG_NAME, "iframe")))
        driver.switch_to.frame(iframe)
        print("Switched to iframe context.")

        # --- STEP 2: Click 'Start' ---
        # We use a generic wildcard '*' to find any element containing text 'Start'
        # just in case it's a div or span, though your previous run said this worked.
        try:
            print("Looking for 'Start' button...")
            start_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Start')]")))
            start_btn.click()
            print("Clicked 'Start'.")
            time.sleep(1) # Brief pause for UI animation
        except:
            print("'Start' button not found or puzzle already started. Continuing...")

        # --- STEP 3: Click first 'Print' ---
        # FIX: Changed from //button to //a[@title='Print']
        print("Looking for first 'Print' button...")
        print_btn_1 = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[@title='Print']")))
        print_btn_1.click()
        print("Clicked first 'Print'.")

        # --- STEP 4: Click 'Solution' ---
        print("Looking for 'Solution' button...")
        sol_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//input[@id='print-solution']")))
        sol_btn.click()
        print("Clicked 'Solution'.")

        # --- STEP 5: Click second 'Print' (Opens new window) ---
        print("Looking for second 'Print' button...")
        original_window = driver.current_window_handle
        
        # We reuse the same robust selector
        # We use 'contains' to handle the extra classes in the HTML string
        print_btn_2 = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'print-button')]")))
        print_btn_2.click()
        print("Clicked second 'Print'. Waiting for new tab...")

        # --- STEP 6: Switch to New Tab ---
        wait.until(EC.number_of_windows_to_be(2))
        
        for window_handle in driver.window_handles:
            if window_handle != original_window:
                driver.switch_to.window(window_handle)
                break
        
        print(f"Switched to new tab. URL: {driver.current_url}")
        
        # Wait for body to ensure load
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        # --- STEP 7: Save HTML ---
        print(f"Saving HTML to {html_filename}...")
        with open(html_filename, "w", encoding="utf-8") as f:
            f.write(driver.page_source)

    except Exception as e:
        print(f"Error during web scraping: {e}")
        driver.save_screenshot("debug_error.png") 
        driver.quit()
        return

    driver.quit()

    # 3. Run the Parser
    print(f"Running parser.py...")
    try:
        subprocess.run(
            ["python3", "parser.py", html_filename, json_output], 
            check=True
        )
        print(f"Success! JSON saved to: {json_output}")
    except subprocess.CalledProcessError as e:
        print(f"Error running parser.py: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 fetch_puzzle.py [puzzle_id]")
        sys.exit(1)
    
    fetch_and_parse(sys.argv[1])