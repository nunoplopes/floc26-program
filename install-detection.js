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
