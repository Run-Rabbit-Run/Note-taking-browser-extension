import { OtherSiteBookmarkType, VideoBookmarkType } from '../types/types.ts';
import { createNoteEditorPopup } from '../helpers/createElements/createNoteEditorPopup.ts';

const BUTTON_WIDTH = 25;

type TextPosition = {
    node: Text;
    offset: number;
};

type TextMap = {
    normalizedText: string;
    charMap: TextPosition[];
};

type TextMatch = {
    range: Range;
    index: number;
};

(() => {
    let youtubeLeftControls, youtubePlayer: HTMLVideoElement;
    let currentVideoId = '';
    let currentVideoUrl = '';
    let currentOtherSiteUrl = '';
    let videoBookmarks: Array<VideoBookmarkType> = [];
    let otherSiteBookmarks: Array<OtherSiteBookmarkType> = [];

    const fetchVideoBookmarks = (): Promise<VideoBookmarkType[]> => {
        return new Promise((resolve) => {
            chrome.storage.sync.get([currentVideoId], (result) => {
                resolve(result[currentVideoId] ? JSON.parse(result[currentVideoId]) : []);
            });
        });
    };

    const fetchOtherSiteBookmarks = (): Promise<OtherSiteBookmarkType[]> => {
        return new Promise((resolve) => {
            chrome.storage.sync.get([currentOtherSiteUrl], (result) => {
                resolve(result[currentOtherSiteUrl] ? JSON.parse(result[currentOtherSiteUrl]) : []);
            });
        });
    };

    const openNoteEditor = (
        selectedText: string,
        selectedTextPosition: number | undefined,
        addNewOtherSiteBookmark: (
            selectedText: string,
            noteText: string,
            selectedTextPosition?: number,
        ) => void,
    ) => {
        createNoteEditorPopup(selectedText, (currentSelectedText, noteText) => {
            addNewOtherSiteBookmark(currentSelectedText, noteText, selectedTextPosition);
        });
    };

    const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim();

    const shouldSkipTextNode = (node: Node) => {
        const parentElement = node.parentElement;

        if (!parentElement) return true;
        if (!node.textContent?.trim()) return true;

        return Boolean(
            parentElement.closest('script, style, noscript, textarea, input, select, option, #RabbitNoteTakingApp'),
        );
    };

    const createTextMap = (): TextMap => {
        let normalizedText = '';
        const charMap: TextPosition[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            },
        });

        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const textContent = node.textContent || '';

            for (let offset = 0; offset < textContent.length; offset++) {
                const char = textContent[offset];
                const isSpace = /\s/.test(char);

                if (isSpace && normalizedText[normalizedText.length - 1] !== ' ') {
                    normalizedText += ' ';
                    charMap.push({ node, offset });
                } else if (!isSpace) {
                    normalizedText += char;
                    charMap.push({ node, offset });
                }
            }
        }

        return { normalizedText, charMap };
    };

    const createRangeFromTextMap = (charMap: TextPosition[], startIndex: number, length: number) => {
        const start = charMap[startIndex];
        const end = charMap[startIndex + length - 1];

        if (!start || !end) return null;

        const range = document.createRange();

        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset + 1);

        return range;
    };

    const getTextMatches = (selectedText: string): TextMatch[] => {
        const targetText = normalizeText(selectedText);

        if (!targetText) return [];

        const { normalizedText, charMap } = createTextMap();
        const sourceText = normalizedText.toLocaleLowerCase();
        const searchText = targetText.toLocaleLowerCase();
        const matches: TextMatch[] = [];
        let matchIndex = sourceText.indexOf(searchText);

        while (matchIndex !== -1) {
            const range = createRangeFromTextMap(charMap, matchIndex, searchText.length);

            if (range) {
                matches.push({ range, index: matchIndex });
            }

            matchIndex = sourceText.indexOf(searchText, matchIndex + searchText.length);
        }

        return matches;
    };

    const getRangeDistance = (sourceRect: DOMRect, targetRange: Range) => {
        const targetRect = targetRange.getBoundingClientRect();

        return Math.abs(sourceRect.top - targetRect.top) + Math.abs(sourceRect.left - targetRect.left);
    };

    const getSelectedTextPosition = (selectedText: string) => {
        const selection = document.getSelection();

        if (!selection || selection.rangeCount === 0) return undefined;

        const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
        const matches = getTextMatches(selectedText);

        if (!matches.length) return undefined;

        const closestMatch = matches.reduce((currentMatch, nextMatch) => {
            const currentDistance = getRangeDistance(selectionRect, currentMatch.range);
            const nextDistance = getRangeDistance(selectionRect, nextMatch.range);

            return nextDistance < currentDistance ? nextMatch : currentMatch;
        });

        return closestMatch.index;
    };

    const findTextMatch = (selectedText: string, selectedTextPosition?: number) => {
        const matches = getTextMatches(selectedText);

        if (!matches.length) return null;

        if (typeof selectedTextPosition !== 'number') {
            return matches[0];
        }

        return matches.reduce((currentMatch, nextMatch) => {
            const currentDistance = Math.abs(currentMatch.index - selectedTextPosition);
            const nextDistance = Math.abs(nextMatch.index - selectedTextPosition);

            return nextDistance < currentDistance ? nextMatch : currentMatch;
        });
    };

    const scrollToOtherSiteBookmark = (selectedText: string, selectedTextPosition?: number) => {
        const match = findTextMatch(selectedText, selectedTextPosition);

        if (!match) return false;

        const selection = document.getSelection();
        const rect = match.range.getBoundingClientRect();

        selection?.removeAllRanges();
        selection?.addRange(match.range);

        if (rect.width === 0 && rect.height === 0) {
            match.range.startContainer.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            window.scrollTo({
                top: rect.top + window.scrollY - window.innerHeight / 3,
                behavior: 'smooth',
            });
        }

        return true;
    };

    const addNewVideoBookmark = async () => {
        videoBookmarks = await fetchVideoBookmarks();
        const currentTime = youtubePlayer.currentTime;
        const videoBookmark: VideoBookmarkType = {
            time: currentTime,
            desc: "Bookmark at " + getTime(currentTime),
            noteText: '',
            pageUrl: currentVideoUrl,
            pageTitle: document.title,
        };

        const newBookmarks = [...videoBookmarks, videoBookmark];

        await chrome.storage.sync.set({
            [currentVideoId]: JSON.stringify(newBookmarks.sort((a, b) => a.time - b.time))
        });
    };

    const addNewOtherSiteBookmark = async (
        selectedText: string,
        noteText: string,
        selectedTextPosition?: number,
    ) => {
        otherSiteBookmarks = await fetchOtherSiteBookmarks();
        const bookmark: OtherSiteBookmarkType = {
            selectedText: selectedText,
            selectedTextPosition,
            noteText: noteText,
            pageUrl: currentOtherSiteUrl,
            pageTitle: document.title,
        };
        const newBookmarks = [...otherSiteBookmarks, bookmark];

        await chrome.storage.sync.set({
            [currentOtherSiteUrl]: JSON.stringify(newBookmarks)
        });
    };

    const newVideoLoaded = async () => {
        videoBookmarks = await fetchVideoBookmarks();
        const bookmarkBtnExists = document.getElementsByClassName("rabbit_bookmark_button")[0];

        if (!bookmarkBtnExists) {
            const bookmarkBtn = document.createElement('img');

            bookmarkBtn.src = chrome.runtime.getURL('note-taking.png');
            bookmarkBtn.className = 'ytp-button rabbit_bookmark_button';
            bookmarkBtn.title = 'Add note';

            youtubeLeftControls = document.getElementsByClassName('ytp-left-controls')[0];
            youtubePlayer = document.getElementsByClassName('video-stream')[0] as HTMLVideoElement;

            if (!youtubeLeftControls) return;

            youtubeLeftControls.appendChild(bookmarkBtn);
            bookmarkBtn.addEventListener('click', addNewVideoBookmark);
        }
    };

    const removeSelectionBtn = () => {
        document.getElementById('RabbitNoteTakingApp')?.remove();
    };

    const otherSiteOpened = async () => {
        otherSiteBookmarks = await fetchOtherSiteBookmarks();

        let timerId: NodeJS.Timeout | null = null;

        document.addEventListener("selectionchange", () => {
            const selectedString = document.getSelection()?.toString();
            const isButtonExist = !!document.querySelector('#RabbitNoteTakingApp');

            if (selectedString && selectedString.length > 0 && !isButtonExist) {
                const selection = document.getSelection();
                if (selection) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const selectedTextPosition = getSelectedTextPosition(selectedString);

                    // delete old button
                    removeSelectionBtn();

                    const selectionBtn = document.createElement('img');
                    selectionBtn.id = 'RabbitNoteTakingApp';
                    selectionBtn.style.position = 'absolute';
                    selectionBtn.style.zIndex = '1000';
                    selectionBtn.style.backgroundColor = '#ff5722';
                    selectionBtn.style.backgroundImage = `url(${chrome.runtime.getURL('edit.png')})`;
                    selectionBtn.style.backgroundSize = 'cover';
                    selectionBtn.style.color = '#fff';
                    selectionBtn.style.border = 'none';
                    selectionBtn.style.borderRadius = '8px';
                    selectionBtn.style.cursor = 'pointer';
                    selectionBtn.style.width = `${BUTTON_WIDTH}px`;
                    selectionBtn.style.height = `${BUTTON_WIDTH}px`;
                    selectionBtn.style.opacity = `0.2`;

                    const topPosition = rect.top + window.scrollY - 40; // 40px над выделением
                    const leftPosition =  rect.left + window.scrollX + (rect.width / 2) - (BUTTON_WIDTH / 2); // Центр по горизонтали
                    selectionBtn.style.top = `${topPosition}px`;
                    selectionBtn.style.left = `${leftPosition}px`;

                    if (timerId) {
                        clearTimeout(timerId);
                    }
                    timerId = setTimeout(() => {
                        document.body.appendChild(selectionBtn);
                    }, 500);

                    selectionBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        // chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
                        openNoteEditor(selectedString, selectedTextPosition, addNewOtherSiteBookmark);

                        // delete after click
                        removeSelectionBtn();
                    });
                }
            } else {
                // if no text selected
                removeSelectionBtn();
            }
        });
    };

    chrome.runtime.onMessage.addListener((obj, _, response) => {
        const { type } = obj;

        if (type === 'VIDEO_ID') {
            const { videoId, videoUrl } = obj;
            currentVideoId = videoId;
            currentVideoUrl = videoUrl;
            newVideoLoaded();
        } else if (type === 'OTHER_SITE') {
            const { otherUrl } = obj;
            currentOtherSiteUrl = otherUrl;
            otherSiteOpened();
        } else if (type === 'PLAY_VIDEO_BOOKMARK') {
            const { value } = obj;
            youtubePlayer.currentTime = value;
        } else if (type === 'SCROLL_TO_OTHER_SITE_BOOKMARK') {
            const { value, selectedTextPosition } = obj;
            const isFound = scrollToOtherSiteBookmark(value, selectedTextPosition);

            response({ isFound });
        } else if (type === 'DELETE_ALL_VIDEO_BOOKMARKS') {
            const { value } = obj;
            videoBookmarks = videoBookmarks.filter((bookmark) => bookmark.time !== value);
            chrome.storage.sync.set({[currentVideoId]: JSON.stringify(videoBookmarks)});

            response(videoBookmarks);
        } else if (type === 'DELETE_OTHER_SITE_BOOKMARK') {
            const { value } = obj;
            otherSiteBookmarks = otherSiteBookmarks.filter((bookmark) => bookmark.selectedText !== value);
            chrome.storage.sync.set({[currentOtherSiteUrl]: JSON.stringify(otherSiteBookmarks)});

            response(otherSiteBookmarks);
        }
    });

    // типа сохраняется урл, а мы привязаны к апдейту
    newVideoLoaded();
})();

const getTime = (time: number) => {
    const date = new Date(0);
    date.setSeconds(time);

    return date.toISOString().substring(14, 19);
};
