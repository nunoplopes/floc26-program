(function () {
    var utcEl = document.getElementById("last_updated_value");
    var localEl = document.getElementById("last_updated_value_local");
    var localGroupEl = document.getElementById("last_updated_local_group");
    if (!utcEl && !localEl)
        return;

    var pageLocale = document.documentElement.lang || undefined;

    var dateTimeParts = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    };

    fetch("build-info.json", { cache: "no-store" })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) {
            if (!data || !data.generatedAtUtc)
                return;

            var date = new Date(data.generatedAtUtc);

            if (utcEl) {
                var utcParts = Object.assign({ timeZone: "UTC" }, dateTimeParts);
                utcEl.textContent = new Intl.DateTimeFormat(pageLocale, utcParts).format(date);
            }

            if (localEl) {
                if (date.getTimezoneOffset() === 0 && localGroupEl) {
                    localGroupEl.style.display = "none";
                } else {
                    localEl.textContent = new Intl.DateTimeFormat(pageLocale, dateTimeParts).format(date);
                }
            }
        })
        .catch(function () { });
})();
