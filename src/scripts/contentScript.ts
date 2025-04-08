import { OtherSiteBookmarkType, VideoBookmarkType } from '../types/types.ts';
import { createNoteEditorPopup } from '../helpers/createElements/createNoteEditorPopup.ts';

const BUTTON_WIDTH = 25;

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
        addNewOtherSiteBookmark: (selectedText: string, noteText: string) => void,
    ) => {
        createNoteEditorPopup(selectedText, addNewOtherSiteBookmark);
    };

    const addNewVideoBookmark = async () => {
        videoBookmarks = await fetchVideoBookmarks();
        const currentTime = youtubePlayer.currentTime;
        const videoBookmark: VideoBookmarkType = {
            time: currentTime,
            desc: "Bookmark at " + getTime(currentTime),
            pageUrl: currentVideoUrl,
            pageTitle: document.title,
        };

        const newBookmarks = [...videoBookmarks, videoBookmark];

        await chrome.storage.sync.set({
            [currentVideoId]: JSON.stringify(newBookmarks.sort((a, b) => a.time - b.time))
        });
    };

    const addNewOtherSiteBookmark = async (selectedText: string, noteText: string) => {
        otherSiteBookmarks = await fetchOtherSiteBookmarks();
        const bookmark: OtherSiteBookmarkType = {
            selectedText: selectedText,
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
            console.log('boof => ', );
            if (selectedString && selectedString.length > 0 && !isButtonExist) {
                const selection = document.getSelection();
                if (selection) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();

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
                        openNoteEditor(selectedString, addNewOtherSiteBookmark);

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
