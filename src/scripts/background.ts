chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
    if (tab.url && tab.url.includes("youtube.com/watch")) {
        const queryParameters = tab.url.split('?')[1];
        const urlParameters = new URLSearchParams(queryParameters);

        chrome.tabs.sendMessage(tabId, {
            type: "VIDEO_ID",
            videoId: urlParameters.get("v"),
            videoUrl: tab.url,
        }).catch(console.error);
    } else {
        chrome.tabs.sendMessage(tabId, {
            type: "OTHER_SITE",
            otherUrl: tab.url,
        }).catch(console.error);
    }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        console.log(
            `Storage key "${key}" in namespace "${namespace}" changed.`,
            `Old value was "${oldValue}", new value is "${newValue}".`
        );
    }
});
