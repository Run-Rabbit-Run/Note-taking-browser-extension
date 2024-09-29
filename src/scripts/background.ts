chrome.tabs.onUpdated.addListener((tabId, _, tab) => {
    if (tab.url && tab.url.includes("youtube.com/watch")) {
        const queryParameters = tab.url.split('?')[1];
        const urlParameters = new URLSearchParams(queryParameters);

        chrome.tabs.sendMessage(tabId, {
            type: "VIDEO_ID",
            videoId: urlParameters.get("v"),
        }).catch(console.error);
    } else {
        chrome.tabs.sendMessage(tabId, {
            type: "OTHER_SITE",
        }).catch(console.error);
    }
});
