if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
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

if (installButton) {
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
