import type { BookmarkType, OtherSiteBookmarkType, VideoBookmarkType } from '../types/types.ts';

type OpenBookmarkInNewTabMessage = {
    type: 'OPEN_BOOKMARK_IN_NEW_TAB';
    bookmark: BookmarkType;
};

const isVideoBookmark = (bookmark: BookmarkType): bookmark is VideoBookmarkType => {
    return 'time' in bookmark;
};

const delay = (delayMs: number) => new Promise((resolve) => {
    setTimeout(resolve, delayMs);
});

const createYouTubeUrlAtTime = (pageUrl: string, time: number) => {
    const seconds = Math.max(0, Math.floor(time));

    try {
        const url = new URL(pageUrl);

        url.searchParams.set('t', `${seconds}s`);

        return url.toString();
    } catch {
        const separator = pageUrl.includes('?') ? '&' : '?';

        return `${pageUrl}${separator}t=${seconds}s`;
    }
};

const waitForTabComplete = (tabId: number) => {
    return new Promise<void>((resolve) => {
        let isResolved = false;

        const complete = () => {
            if (isResolved) return;

            isResolved = true;
            chrome.tabs.onUpdated.removeListener(onUpdated);
            resolve();
        };

        const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                complete();
            }
        };

        chrome.tabs.onUpdated.addListener(onUpdated);
        chrome.tabs.get(tabId)
            .then((tab) => {
                if (tab.status === 'complete') {
                    complete();
                }
            })
            .catch(complete);

        setTimeout(complete, 15000);
    });
};

const sendTabMessageWithRetries = async (
    tabId: number,
    message: Record<string, unknown>,
    isSuccessful: (response: unknown) => boolean,
) => {
    for (let attempt = 0; attempt < 16; attempt++) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, message);

            if (isSuccessful(response)) {
                return response;
            }
        } catch {
            // Content scripts can take a moment to attach after a new tab is created.
        }

        await delay(500);
    }

    return null;
};

const openVideoBookmarkInNewTab = async (bookmark: VideoBookmarkType) => {
    const tab = await chrome.tabs.create({
        url: createYouTubeUrlAtTime(bookmark.pageUrl, bookmark.time),
        active: true,
    });

    if (!tab.id) return { isOpened: true, isPlayed: false };

    await waitForTabComplete(tab.id);
    const response = await sendTabMessageWithRetries(
        tab.id,
        {
            type: 'PLAY_VIDEO_BOOKMARK',
            value: bookmark.time,
        },
        (response) => {
            if (!response || typeof response !== 'object') return true;

            return 'isPlayed' in response && Boolean(response.isPlayed);
        },
    );

    return { isOpened: true, isPlayed: Boolean(response) };
};

const openOtherSiteBookmarkInNewTab = async (bookmark: OtherSiteBookmarkType) => {
    const tab = await chrome.tabs.create({
        url: bookmark.pageUrl,
        active: true,
    });

    if (!tab.id) return { isOpened: true, isScrolled: false };

    await waitForTabComplete(tab.id);
    const response = await sendTabMessageWithRetries(
        tab.id,
        {
            type: 'SCROLL_TO_OTHER_SITE_BOOKMARK',
            value: bookmark.selectedText,
            selectedTextPosition: bookmark.selectedTextPosition,
        },
        (response) => {
            return Boolean(
                response &&
                typeof response === 'object' &&
                'isFound' in response &&
                response.isFound
            );
        },
    );

    return { isOpened: true, isScrolled: Boolean(response) };
};

const openBookmarkInNewTab = async (bookmark: BookmarkType) => {
    if (isVideoBookmark(bookmark)) {
        return openVideoBookmarkInNewTab(bookmark);
    }

    return openOtherSiteBookmarkInNewTab(bookmark);
};

chrome.runtime.onMessage.addListener((message: OpenBookmarkInNewTabMessage, _, sendResponse) => {
    if (message.type !== 'OPEN_BOOKMARK_IN_NEW_TAB') return false;

    openBookmarkInNewTab(message.bookmark)
        .then(sendResponse)
        .catch(() => sendResponse({ isOpened: false }));

    return true;
});

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
