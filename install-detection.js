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
        installButton.style.display = 'block';
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
