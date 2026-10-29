"""Exercise adaptive quizzes against the real catalog/UI on localhost:8765."""
from playwright.sync_api import sync_playwright, expect


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1200, "height": 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8765/')
    expect(page.get_by_role('button', name='Quick quiz', exact=True)).to_have_count(0)
    expect(page.get_by_role('button', name='Endless quiz', exact=True)).to_have_count(0)
    page.locator('#all-categories').uncheck()
    expect(page.get_by_role('button', name='Quiz all selected', exact=True)).to_be_disabled()
    category = page.evaluate("categories.find(c => c.name === 'Metathesis').id")
    page.locator(f'[data-category-select="{category}"]').check()
    pool = page.evaluate('selectedReactions().map(r => r.id)')
    assert len(pool) >= 2
    dialog = page.locator('#quiz-dialog')

    def current_id():
        return page.evaluate('quiz.questions[quiz.index].id')

    def respond(correct=True):
        current = current_id()
        selector = f'[data-answer="{current}"]' if correct else f'[data-answer]:not([data-answer="{current}"])'
        dialog.locator(selector).first.click()

    def next_question():
        dialog.locator('#next-question').click()

    page.get_by_role('button', name='Quiz all selected', exact=True).click()
    assert set(page.evaluate('quiz.pool.map(r => r.id)')) == set(pool)
    missed = current_id()
    respond(False)
    expect(dialog.locator('#answer-feedback')).to_contain_text('three times in a row')
    assert page.evaluate('quiz.questions.at(-1).id') == missed
    # Duplicate answers and premature completion cannot inflate progress.
    page.evaluate('answer(quiz.questions[quiz.index].id); finishQuiz()')
    assert page.evaluate('quiz.answeredCount') == 1
    assert page.evaluate('state.sessions.length') == 0
    next_question()
    seen = {missed}
    for _ in range(len(pool) - 1):
        assert current_id() not in seen
        seen.add(current_id())
        respond()
        next_question()
    assert seen == set(pool)
    # Two successes followed by a mistake reset the review requirement.
    for expected in [1, 2]:
        assert current_id() == missed
        respond()
        expect(dialog.locator('#answer-feedback')).to_contain_text(f'{expected} / 3')
        next_question()
    respond(False)
    assert page.evaluate('quiz.correctStreaks.get(quiz.questions[quiz.index].id)') == 0
    next_question()
    for expected in [1, 2, 3]:
        respond()
        expect(dialog.locator('#answer-feedback')).to_contain_text(f'{expected} / 3')
        if expected < 3:
            assert page.evaluate('state.sessions.length') == 0
        next_question()
    expect(dialog.get_by_role('heading', name='Quiz complete', exact=True)).to_be_visible()
    result = page.evaluate('state.sessions.at(-1)')
    assert result['total'] == len(pool) + 6
    assert result['correct'] == result['total'] - 2
    assert page.evaluate('state.attempts.length') == result['total']
    assert page.evaluate('quiz.cleared.size') == len(pool)
    assert page.evaluate('mastered().has(quiz.questions[0].id)')
    page.evaluate('finishQuiz()')
    assert page.evaluate('state.sessions.length') == 1
    dialog.get_by_role('button', name='Done', exact=True).click()
    # A fresh all-correct session clears each reaction once, regardless of history.
    page.get_by_role('button', name='Quiz all selected', exact=True).click()
    for _ in pool:
        respond()
        next_question()
    assert page.evaluate('state.sessions.at(-1).total') == len(pool)
    dialog.get_by_role('button', name='Done', exact=True).click()
    # A one-reaction saved deck still has distractors and repeats to three successes.
    page.evaluate("state.saved=[selectedReactions()[0].id]; persist(); location.hash='practice'")
    expect(page.locator('[data-start="endless"]')).to_have_count(0)
    page.get_by_role('button', name='Start saved reactions', exact=True).click()
    assert page.evaluate('quiz.pool.length') == 1
    assert dialog.locator('[data-answer]').count() == 4
    respond(False)
    next_question()
    for _ in range(3):
        respond()
        next_question()
    assert page.evaluate('state.sessions.at(-1).total') == 4
    dialog.get_by_role('button', name='Done', exact=True).click()
    # Leaving a pending review keeps attempts but creates no completed session.
    completed = page.evaluate('state.sessions.length')
    attempts = page.evaluate('state.attempts.length')
    page.get_by_role('button', name='Start quiz all selected', exact=True).click()
    respond(False)
    dialog.get_by_role('button', name='Exit quiz', exact=True).click()
    dialog.get_by_role('button', name='Continue', exact=True).click()
    expect(dialog.locator('#next-question')).to_be_enabled()
    dialog.get_by_role('button', name='Exit quiz', exact=True).click()
    dialog.get_by_role('button', name='Leave', exact=True).click()
    assert page.evaluate('state.sessions.length') == completed
    page.reload()
    assert page.evaluate('state.attempts.length') == attempts + 1
    assert page.evaluate('state.sessions.length') == completed
    assert not errors, errors
    print('PASS: filtered deck, removed modes, retry ordering, three-success streak/reset, duplicate guards, all-correct run, single-card reviews, scoring, exit/continue, and persisted progress.')
    browser.close()
