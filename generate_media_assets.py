import os
import time
import shutil
import cv2
from PIL import Image
from playwright.sync_api import sync_playwright

os.makedirs('assets', exist_ok=True)
video_dir = os.path.abspath('assets/video_temp')
os.makedirs(video_dir, exist_ok=True)

with sync_playwright() as p:
    print('Launching Edge browser for full video recording...')
    browser = p.chromium.launch(channel='msedge', headless=True)
    
    context = browser.new_context(
        viewport={'width': 1440, 'height': 900},
        record_video_dir=video_dir,
        record_video_size={'width': 1440, 'height': 900}
    )
    page = context.new_page()
    
    print('1. Navigating to http://127.0.0.1:8000 ...')
    page.goto('http://127.0.0.1:8000', wait_until='networkidle')
    
    # 2. Splash screen zoom animation
    time.sleep(3.5)
    page.wait_for_selector('.app-container', state='visible')
    time.sleep(1.5)
    
    # Capture Screenshot 1: Dark Workspace Overview
    page.screenshot(path='assets/nexus_dark_workspace.png')
    print('Captured assets/nexus_dark_workspace.png')
    
    # 3. Toggle to Light Studio Theme
    theme_btn = page.query_selector('#theme-toggle-btn')
    if theme_btn:
        theme_btn.click()
        time.sleep(2.0)
        page.screenshot(path='assets/nexus_light_workspace.png')
        print('Captured assets/nexus_light_workspace.png')
        
        # Switch back to Dark Mode
        theme_btn.click()
        time.sleep(1.5)
        
    # 4. Open Configurations Suite Modal
    settings_btn = page.query_selector('#settings-footer-btn')
    if settings_btn:
        settings_btn.click()
        time.sleep(2.0)
        page.screenshot(path='assets/nexus_configurations_modal.png')
        print('Captured assets/nexus_configurations_modal.png')
        
        # Click Knowledge Catalog & Memory Tab
        kn_tab = page.query_selector('[data-settings-tab="documents-tab"]')
        if kn_tab:
            kn_tab.click()
            time.sleep(2.0)
            page.screenshot(path='assets/nexus_knowledge_modal.png')
            print('Captured assets/nexus_knowledge_modal.png')
            
        # Click Custom Skills Library Tab
        sk_tab = page.query_selector('[data-settings-tab="skills-tab"]')
        if sk_tab:
            sk_tab.click()
            time.sleep(2.0)
            page.screenshot(path='assets/nexus_skills_modal.png')
            print('Captured assets/nexus_skills_modal.png')
            
        # Click Agent Teamwork Logs Tab
        log_tab = page.query_selector('[data-settings-tab="agent-log-tab"]')
        if log_tab:
            log_tab.click()
            time.sleep(2.0)
            page.screenshot(path='assets/nexus_agent_logs_modal.png')
            print('Captured assets/nexus_agent_logs_modal.png')
            
        # Return to API tab and close
        api_tab = page.query_selector('[data-settings-tab="api-tab"]')
        if api_tab:
            api_tab.click()
            time.sleep(1.5)
            
        close_btn = page.query_selector('#settings-close-btn')
        if close_btn:
            close_btn.click()
            time.sleep(1.5)

    time.sleep(1.5)
    context.close()
    browser.close()

# Process recorded video file
video_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith('.webm')]
if video_files:
    latest_video = video_files[0]
    target_video = 'assets/nexus_demo.webm'
    shutil.copy2(latest_video, target_video)
    shutil.rmtree(video_dir, ignore_errors=True)
    print(f'Saved 18-second video demo to {target_video}')
    
    # Convert full video to high quality animated GIF
    cap = cv2.VideoCapture(target_video)
    frames = []
    fps = cap.get(cv2.CAP_PROP_FPS) or 20
    print(f'Converting full video to GIF (FPS: {fps}) ...')
    
    count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        count += 1
        # Frame sampling for smooth 10fps GIF animation
        if count % 2 == 0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w, _ = rgb.shape
            new_w = 760
            new_h = int(h * (760 / w))
            resized = cv2.resize(rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
            pil_img = Image.fromarray(resized)
            frames.append(pil_img)
            
    cap.release()
    if frames:
        frames[0].save(
            'assets/nexus_demo.gif',
            save_all=True,
            append_images=frames[1:],
            duration=int(1000 / (fps / 2)),
            loop=0,
            optimize=True
        )
        print('Saved assets/nexus_demo.gif! Size:', os.path.getsize('assets/nexus_demo.gif'), 'bytes')

print('All extended media asset generation complete!')
