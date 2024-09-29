import { VideoBookmarkType } from '../types/types.ts';
// import { isVideoBookmark } from '../helpers/typeUtils.ts';

(() => {
    let youtubeLeftControls, youtubePlayer: HTMLVideoElement;
    let currentVideoId = '';
    // let currentOtherSiteUrl = '';
    let videoBookmarks: Array<VideoBookmarkType> = [];
    // let otherSiteBookmarks: Array<OtherSiteBookmarkType> = [];

    const fetchVideoBookmarks = (): Promise<VideoBookmarkType[]> => {
        return new Promise((resolve) => {
            chrome.storage.sync.get([currentVideoId], (result) => {
                resolve(result[currentVideoId] ? JSON.parse(result[currentVideoId]) : []);
            });
        });
    };

    // const fetchOtherSiteBookmarks = (): Promise<OtherSiteBookmarkType[]> => {
    //     return new Promise((resolve) => {
    //         chrome.storage.sync.get([currentOtherSiteUrl], (result) => {
    //             resolve(result[currentOtherSiteUrl] ? JSON.parse(result[currentOtherSiteUrl]) : []);
    //         });
    //     });
    // };

    const addNewBookmarkEventHandler = async () => {
        videoBookmarks = await fetchVideoBookmarks();
        const currentTime = youtubePlayer.currentTime;
        const videoBookmark: VideoBookmarkType = {
            time: currentTime,
            desc: "Bookmark at " + getTime(currentTime),
        };
        const newBookmarks = [...videoBookmarks, videoBookmark];

        chrome.storage.sync.set({
            [currentVideoId]: JSON.stringify(newBookmarks.sort((a, b) => a.time - b.time))
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
            bookmarkBtn.addEventListener('click', addNewBookmarkEventHandler);
        }
    };

    const otherSiteOpened = () => {
        document.addEventListener("selectionchange", () => {
            console.log(document.getSelection()?.toString());
        });
    };

    chrome.runtime.onMessage.addListener((obj, _, response) => {
        const {type, value, videoId} = obj;

        if (type === 'VIDEO_ID') {
            currentVideoId = videoId;
            newVideoLoaded();
        } else if (type === 'OTHER_SITE') {
            otherSiteOpened();
        } else if (type === 'PLAY_VIDEO_BOOKMARK') {
            youtubePlayer.currentTime = value;
        } else if (type === 'DELETE_ALL_VIDEO_BOOKMARKS') {
            videoBookmarks = videoBookmarks.filter((bookmark) => bookmark.time !== value);
            chrome.storage.sync.set({[currentVideoId]: JSON.stringify(videoBookmarks)});

            response(videoBookmarks);
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
