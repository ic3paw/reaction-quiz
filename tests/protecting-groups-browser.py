"""Protecting-group browsing, condition tabs, source links, and mobile/dark layouts."""
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors, failures, requests = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append(response.url) if response.status >= 400 else None)
    page.on('request', lambda request: requests.append(request.url))
    page.goto('http://127.0.0.1:8765/#protecting')
    expect(page.locator('h1')).to_have_text('Protecting groups')
    expect(page.locator('.category-sidebar')).to_be_hidden()
    expect(page.locator('.protecting-row')).to_have_count(60)
    expect(page.locator('#protecting-count')).to_contain_text('1,411 entries')
    assert not any('/protecting-groups/page-' in url for url in requests), 'Source images must load on demand'
    page.locator('[data-protecting-page="1"]').click()
    expect(page.locator('#protecting-page')).to_have_text('Page 2 of 24')
    page.locator('#protecting-chapter').select_option('chapter-8')
    expect(page.locator('.protecting-row')).to_have_count(13)
    expect(page.locator('[data-protecting-page="-1"]')).to_be_disabled()
    page.locator('#protecting-chapter').select_option('chapter-7')
    page.locator('#protecting-search').fill('Fmoc')
    expect(page.locator('[data-protecting-id="greene-7-0838"]')).to_be_visible()
    page.locator('[data-protecting-id="greene-7-0838"]').click()
    dialog = page.locator('#protecting-dialog')
    expect(dialog.locator('#protecting-title')).to_have_text('9-Fluorenylmethyl')
    expect(dialog.locator('[data-protecting-tab="protection"]')).to_have_attribute('aria-selected', 'true')
    image = dialog.locator('img').first
    expect(image).to_have_attribute('src', 'assets/protecting-groups/page-0712.webp')
    image.scroll_into_view_if_needed()
    page.wait_for_function("document.querySelector('#protecting-dialog img').naturalWidth > 0")
    expect(image).to_have_css('background-color', 'rgb(255, 255, 255)')
    dialog.locator('[data-protecting-tab="deprotection"]').click()
    expect(dialog.locator('#protecting-panel')).to_have_attribute('aria-labelledby', 'protecting-tab-deprotection')
    assert dialog.locator('img').count() >= 2
    page.keyboard.press('ArrowRight')
    expect(dialog.locator('[data-protecting-tab="source"]')).to_have_attribute('aria-selected', 'true')
    expect(dialog.locator('a').first).to_have_attribute('href', 'assets/protecting-groups/page-0711.webp')
    page.keyboard.press('Escape')
    expect(dialog).not_to_be_visible()
    # Every chapter is reachable; the source excerpt is not a placeholder.
    for chapter in range(2, 10):
        page.locator('#protecting-search').fill('')
        page.locator('#protecting-chapter').select_option(f'chapter-{chapter}')
        page.locator('.protecting-row button').first.click()
        expect(dialog).to_be_visible()
        expect(dialog.locator('img').first).to_be_attached()
        page.keyboard.press('Escape')
    page.locator('#protecting-chapter').select_option('chapter-2')
    page.locator('#protecting-search').fill('Nitrate')
    page.locator('[data-protecting-id="greene-2-0225"]').click()
    expect(dialog.locator('.account-notice')).to_contain_text('no separately labeled Formation section')
    dialog.locator('[data-protecting-tab="deprotection"]').click()
    expect(dialog.locator('.account-notice')).to_contain_text('no separately labeled Cleavage section')
    page.keyboard.press('Escape')
    page.locator('#protecting-search').fill('nothing matches 1234567')
    expect(page.locator('.protecting-row')).to_have_count(0)
    expect(page.locator('[data-protecting-page="1"]')).to_be_disabled()
    page.locator('#protecting-search').fill('')
    page.locator('#protecting-section').select_option('Ethers / Substituted Methyl Ethers')
    assert page.locator('.protecting-row').count() > 0
    page.locator('.menu-toggle').click()
    for width in [1440, 1200, 1199, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 900})
        page.wait_for_timeout(900)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        brand = page.locator('.brand').bounding_box()
        controls = page.locator('.header-controls').bounding_box()
        assert brand['x'] + brand['width'] <= controls['x']
        if width >= 1200:
            last = page.locator('.nav-item').last.bounding_box()
            assert last['x'] + last['width'] <= controls['x']
    page.locator('.menu-toggle').click()
    page.get_by_role('button', name='Dark mode', exact=True).click()
    page.locator('[data-protecting-id="greene-2-0004"]').click()
    expect(dialog).to_have_css('background-color', 'rgb(24, 24, 27)')
    expect(dialog.locator('img').first).to_have_css('background-color', 'rgb(255, 255, 255)')
    assert dialog.evaluate('(el) => el.scrollWidth <= el.clientWidth')
    page.screenshot(path='/tmp/protecting-mobile-dark.png')
    assert not errors, errors
    assert not failures, failures
    browser.close()
    print('PASS: chapter order, filtering/search, pagination, both condition tabs, source links, reference-only entries, lazy images, mobile menu, and dark mode.')
