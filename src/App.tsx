import { useEffect, useState } from 'react';
import { getActiveTab } from './helpers/utils.ts';
import Tab = chrome.tabs.Tab;
import { VideoBookmarkType } from './types/types.ts';
import cls from './App.module.scss';
import PlayVideoIcon from './assets/play_video.svg?react';
import DeleteIcon from './assets/delete.svg?react';

// const test = [
//     {
//         "time": 7.191035,
//         "desc": "Bookmark at 00:07"
//     },
//     {
//         "time": 269.908833,
//         "desc": "Bookmark at 04:29"
//     },
//     {
//         "time": 282.663094,
//         "desc": "Bookmark at 04:42"
//     },
//     {
//         "time": 298.911437,
//         "desc": "Bookmark at 04:58"
//     }
// ];

const App = () => {
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [bookmarks, setBookmarks] = useState<VideoBookmarkType[]>([]);
    const [text, setText] = useState('');
    const getBookmarksFromStorage = async () => {
        const tab = await getActiveTab();
        setActiveTab(tab);
        const queryParameters = tab?.url?.split('?')[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const currentVideoId = urlParameters.get('v');

        if (tab?.url?.includes('youtube.com/watch') && currentVideoId) {
            setText(tab.title || 'Where is my title?');
            chrome.storage.sync.get([currentVideoId], (data) => {
                const currentVideoBookmarks = data[currentVideoId] ? JSON.parse(data[currentVideoId]) : [];

                setBookmarks(currentVideoBookmarks);
            });
        } else {
            setText('This is not a youtube video');
        }
    };

    const onPlayBookmark = (bookmark: VideoBookmarkType) => {
        chrome.tabs.sendMessage(activeTab?.id || 0, {
            type: "PLAY_VIDEO_BOOKMARK",
            value: bookmark.time,
        });
    };

    const onDeleteBookmark = (bookmark: VideoBookmarkType) => {
        chrome.tabs.sendMessage(activeTab?.id || 0, {
            type: "DELETE_ALL_VIDEO_BOOKMARKS",
            value: bookmark.time,
        }, getBookmarksFromStorage);
    };

    useEffect(() => {
        getBookmarksFromStorage().catch(console.error);
    }, []);

    return (
        <div>
            {text}
            <div>
                {bookmarks.length > 0 ? (
                    <div className={cls.videoBookmarksList}>
                        {bookmarks.map((bookmark) => (
                            <div key={`rabbit-bookmark-${bookmark.time}`} className={cls.videoBookmark}>
                                <p>
                                    {bookmark.desc} - {bookmark.time}
                                </p>
                                <div className={cls.buttonWrapper}>
                                    <button className={cls.button} onClick={() => onPlayBookmark(bookmark)}>
                                        <PlayVideoIcon className={cls.icon} />
                                    </button>
                                    <button className={cls.button} onClick={() => onDeleteBookmark(bookmark)}>
                                        <DeleteIcon className={cls.icon} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>No bookmarks</div>
                )}
            </div>
        </div>
    );
};

export default App;
