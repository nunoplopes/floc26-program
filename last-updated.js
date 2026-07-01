(function () {
    var valueEl = document.getElementById("last_updated_value");
    if (!valueEl)
        return;

    fetch("build-info.json", { cache: "no-store" })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (data) {
            if (!data || !data.generatedAtUtc)
                return;

            var date = new Date(data.generatedAtUtc);
            valueEl.textContent = date.toLocaleString();
        })
        .catch(function () { });
})();
