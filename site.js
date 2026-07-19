if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then((registration) => {
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateToast();
                    }
                });
            });
        })
        .catch(() => {});
}

function showUpdateToast() {
    if (document.getElementById('pwa_update_toast')) return;

    const labelsEl = document.getElementById('pwa_labels');
    const message = (labelsEl && labelsEl.dataset.updateMessage) || 'New version available.';
    const actionLabel = (labelsEl && labelsEl.dataset.updateAction) || 'Reload';

    const toast = document.createElement('div');
    toast.id = 'pwa_update_toast';

    const text = document.createElement('span');
    text.textContent = message;

    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'pwa_update_reload';
    reloadBtn.textContent = actionLabel;
    reloadBtn.addEventListener('click', () => window.location.reload());

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'pwa_update_dismiss';
    dismissBtn.textContent = '✕';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(text);
    toast.appendChild(reloadBtn);
    toast.appendChild(dismissBtn);
    document.body.appendChild(toast);
}

window.addEventListener('load', () => {
    document.querySelectorAll('#menu2, #menu3').forEach((container) => {
        if (container.scrollHeight <= container.clientHeight) return;
        const selected = container.querySelector('a.selected');
        if (!selected) return;
        container.scrollTop = selected.offsetTop - container.offsetTop
            - (container.clientHeight / 2) + (selected.clientHeight / 2);
    });
});

let deferredPrompt;
const installButton = document.getElementById('install_pwa_btn');

const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

if (installButton) {
    if (isIos && !isStandalone) {
        installButton.style.display = 'flex';
        installButton.addEventListener('click', () => {
            window.location.href = 'install-ios.html';
        });
    } else {
        installButton.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        deferredPrompt = null;
                        installButton.style.display = 'none';
                    }
                });
            }
        });
    }
}

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) {
        installButton.style.display = 'flex';
    }
});

window.addEventListener('appinstalled', () => {
    if (installButton) {
        installButton.style.display = 'none';
    }
    deferredPrompt = null;
});

const backBtn = document.getElementById('back_btn');
if (backBtn && window.history.length > 1 && document.referrer) {
    backBtn.classList.add('visible');
    backBtn.addEventListener('click', () => {
        history.back();
    });
}

const themeToggleBtn = document.getElementById('theme_toggle_btn');
const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function isDarkActive() {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return prefersDarkQuery.matches;
}

function updateThemeToggleIcon() {
    if (themeToggleBtn) {
        themeToggleBtn.textContent = isDarkActive() ? '☀️' : '🌙';
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const next = isDarkActive() ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeToggleIcon();
    });
    updateThemeToggleIcon();
    prefersDarkQuery.addEventListener('change', updateThemeToggleIcon);
}

const headerMenuBtn = document.getElementById('header_menu_btn');
const headerMenuPanel = document.getElementById('header_menu_panel');

if (headerMenuBtn && headerMenuPanel) {
    const closeHeaderMenu = () => {
        headerMenuPanel.classList.remove('open');
        headerMenuBtn.setAttribute('aria-expanded', 'false');
    };

    headerMenuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = headerMenuPanel.classList.toggle('open');
        headerMenuBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
        if (!headerMenuPanel.classList.contains('open')) return;
        if (event.target === headerMenuBtn || headerMenuPanel.contains(event.target)) return;
        closeHeaderMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeHeaderMenu();
    });
}

const AGENDA_STORAGE_KEY = 'floc:agenda-favorites';

function getAgendaFavorites() {
    try {
        return JSON.parse(localStorage.getItem(AGENDA_STORAGE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function saveAgendaFavorites(favorites) {
    localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(favorites));
}

document.querySelectorAll('.favorite_btn').forEach((button) => {
    const sessionId = button.dataset.sessionId;

    const applyState = (isFavorited) => {
        button.textContent = isFavorited ? '★' : '☆';
        button.classList.toggle('favorited', isFavorited);
        button.setAttribute('aria-pressed', String(isFavorited));
        button.title = isFavorited ? button.dataset.removeLabel : button.dataset.addLabel;
        button.setAttribute('aria-label', button.title);
    };

    button.dataset.addLabel = button.title;
    applyState(getAgendaFavorites().some((f) => f.id === sessionId));

    button.addEventListener('click', (event) => {
        event.preventDefault();
        const favorites = getAgendaFavorites();
        const index = favorites.findIndex((f) => f.id === sessionId);

        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            favorites.push({
                id: sessionId,
                title: button.dataset.title,
                time: button.dataset.time,
                room: button.dataset.room,
                group: button.dataset.group,
                day: button.dataset.day,
                href: location.pathname.split('/').pop() + '#session:' + sessionId,
            });
        }

        saveAgendaFavorites(favorites);
        applyState(index < 0);
    });
});

(function () {
    const nowLabelsEl = document.getElementById('now_labels');
    const sessionEls = document.querySelectorAll('.session[data-date]');
    if (!nowLabelsEl || sessionEls.length === 0) return;

    fetch('build-info.json', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
            const timeZone = (data && data.eventTimeZone) || 'UTC';
            highlightCurrentSession(getEventNowStamp(timeZone));
        })
        .catch(() => {});

    function getEventNowStamp(timeZone) {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(new Date());
        const get = (type) => parts.find((p) => p.type === type).value;
        return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
    }

    function highlightCurrentSession(nowStamp) {
        let matched = null;

        sessionEls.forEach((el) => {
            const date = el.dataset.date;
            const start = el.dataset.start;
            const end = el.dataset.end;
            if (!date || !start || !end) return;

            const isNow = nowStamp >= `${date}T${start}` && nowStamp < `${date}T${end}`;
            if (!isNow) return;

            el.classList.add('session_now');
            if (!el.querySelector('.now_badge')) {
                const badge = document.createElement('span');
                badge.className = 'now_badge';
                badge.textContent = nowLabelsEl.dataset.badgeLabel || 'NOW';
                const heading = el.querySelector('.heading');
                if (heading) heading.appendChild(badge);
            }

            if (!matched) matched = el;
        });

        const pageTitle = document.getElementById('pagetitle');
        if (matched && pageTitle && !document.getElementById('jump_to_now_link')) {
            const link = document.createElement('a');
            link.id = 'jump_to_now_link';
            link.className = 'jump_to_now_link';
            link.href = `#${matched.id}`;
            link.textContent = nowLabelsEl.dataset.jumpLabel || 'Jump to current session';
            pageTitle.insertAdjacentElement('afterend', link);
        }

        if (matched && !location.hash) {
            matched.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
})();

(function () {
    const nowLink = document.getElementById('now_link');
    const todayLink = document.getElementById('today_link');
    if (!nowLink && !todayLink) return;

    function getEventNowStamp(timeZone) {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(new Date());
        const get = (type) => parts.find((p) => p.type === type).value;
        return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
    }

    Promise.all([
        fetch('now-data.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
        fetch('build-info.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ]).then(([sessions, buildInfo]) => {
        const timeZone = (buildInfo && buildInfo.eventTimeZone) || 'UTC';
        const nowStamp = getEventNowStamp(timeZone);

        if (nowLink) {
            const hasCurrentOrUpcoming = sessions.some((s) => s.end && `${s.date}T${s.end}` > nowStamp);
            if (!hasCurrentOrUpcoming) {
                nowLink.style.display = 'none';
            }
        }

        if (todayLink) {
            const todayIso = nowStamp.slice(0, 10);
            const eventDays = (buildInfo && buildInfo.eventDays) || [];
            if (eventDays.includes(todayIso)) {
                todayLink.href = `${todayIso}.html`;
                todayLink.style.display = 'flex';
            }
        }

        const liveGroupIds = new Set(
            sessions.filter((s) => s.end && `${s.date}T${s.start}` <= nowStamp && nowStamp < `${s.date}T${s.end}`)
                .map((s) => s.groupId)
        );
        document.querySelectorAll('#menu2 a[data-group-id], .group_tile[data-group-id]').forEach((chip) => {
            if (liveGroupIds.has(Number(chip.dataset.groupId)) && !chip.querySelector('.live_dot')) {
                const dot = document.createElement('span');
                dot.className = 'live_dot';
                const label = chip.querySelector('.group_tile_label');
                (label || chip).appendChild(dot);
            }
        });
    }).catch(() => {});
})();

const fabTop = document.getElementById('fab_top');
if (fabTop) {
    const toggleFabTop = () => {
        fabTop.classList.toggle('visible', window.scrollY > 300);
    };
    window.addEventListener('scroll', toggleFabTop, { passive: true });
    toggleFabTop();

    fabTop.addEventListener('click', (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
