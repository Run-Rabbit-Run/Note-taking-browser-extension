import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDownloadBookmarksLink, getActiveTab } from './helpers/utils.ts';
import { OtherSiteBookmarkType, VideoBookmarkType } from './types/types.ts';
import cls from './App.module.scss';
import { TextBookmark } from './components/TextBookmark';
import { AllNotes } from './components/AllNotes';
import VideoBookmark from './components/VideoBookmark/ui/VideoBookmark.tsx';
import Tab = chrome.tabs.Tab;

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
    const [videoBookmarks, setVideoBookmarks] = useState<VideoBookmarkType[]>([]);
    const [otherSiteBookmarks, setOtherSiteBookmarks] = useState<OtherSiteBookmarkType[]>([]);
    const [text, setText] = useState('');
    const [isShowAllNotes, setIsShowAllNotes] = useState(false);

    const getBookmarksFromStorage = async () => {
        const tab = (await getActiveTab()) || activeTab;
        setActiveTab(tab);
        const queryParameters = tab?.url?.split('?')[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const currentVideoId = urlParameters.get('v');

        if (tab?.url?.includes('youtube.com/watch') && currentVideoId) {
            setText(tab?.title || 'Where is my title?');
            chrome.storage.sync.get([currentVideoId], (data) => {
                const currentVideoBookmarks = data[currentVideoId] ? JSON.parse(data[currentVideoId]) : [];

                setVideoBookmarks(currentVideoBookmarks);
            });
        } else {
            setText('This is not a youtube video');

            chrome.storage.sync.get([tab?.url], (data) => {
                let currentOtherSiteBookmarks = [];

                if (tab?.url) {
                    currentOtherSiteBookmarks = data[tab?.url] ? JSON.parse(data[tab?.url]) : [];
                }

                setOtherSiteBookmarks(currentOtherSiteBookmarks);
            });
        }
    };

    const onPlayBookmark = useCallback(
        (bookmark: VideoBookmarkType) => {
            chrome.tabs
                .sendMessage(activeTab?.id || 0, {
                    type: 'PLAY_VIDEO_BOOKMARK',
                    value: bookmark.time,
                })
                .catch((error) => console.error(error));
        },
        [activeTab?.id],
    );

    const onDeleteBookmark = useCallback(
        (bookmark: VideoBookmarkType) => {
            chrome.tabs.sendMessage(
                activeTab?.id || 0,
                {
                    type: 'DELETE_ALL_VIDEO_BOOKMARKS',
                    value: bookmark.time,
                },
                getBookmarksFromStorage,
            );
        },
        [activeTab?.id],
    );

    const onDeleteOtherBookmark = useCallback(
        (bookmark: OtherSiteBookmarkType) => {
            chrome.tabs.sendMessage(
                activeTab?.id || 0,
                {
                    type: 'DELETE_OTHER_SITE_BOOKMARK',
                    value: bookmark.selectedText,
                },
                getBookmarksFromStorage,
            );
        },
        [activeTab?.id],
    );

    const onEditOtherBookmark = useCallback(
        async (bookmark: OtherSiteBookmarkType) => {
            const { selectedText, noteText, pageTitle, pageUrl } = bookmark;

            const editedBookmark = otherSiteBookmarks.find((bookmark) => bookmark.selectedText === selectedText);

            if (editedBookmark) {
                editedBookmark.noteText = noteText;
                const newBookmark = {
                    selectedText,
                    noteText,
                    pageTitle,
                    pageUrl,
                };
                const editedBookmarkIndex = otherSiteBookmarks.findIndex(
                    (bookmark) => bookmark.selectedText === selectedText,
                );

                otherSiteBookmarks[editedBookmarkIndex] = newBookmark;

                if (activeTab?.url) {
                    await chrome.storage.sync.set({ [activeTab?.url]: JSON.stringify(otherSiteBookmarks) });
                }
            }
        },
        [activeTab, otherSiteBookmarks],
    );

    useEffect(() => {
        getBookmarksFromStorage().catch(console.error);
    }, []);

    const renderOtherBookmarks = useMemo(() => {
        if (!otherSiteBookmarks || otherSiteBookmarks.length === 0) {
            return <div className={cls.emptyState}>No other bookmarks</div>;
        }

        const url = createDownloadBookmarksLink(otherSiteBookmarks, activeTab?.url);

        const download = () => {
            chrome.downloads.download({
                url: url,
                filename: 'Obsidian/фай8л.md', // Предложит сохранить в подпапку Obsidian
                saveAs: true, // Покажет диалог сохранения
            });
        };

        return (
            <div className={cls.otherBookmarksList}>
                {otherSiteBookmarks.map((bookmark) => (
                    <TextBookmark
                        key={bookmark.selectedText}
                        bookmark={bookmark}
                        onEdit={onEditOtherBookmark}
                        onDelete={onDeleteOtherBookmark}
                    />
                ))}
                {/*<a href={url} download={`${activeTab?.title}.md`}>*/}
                <a className={cls.exportLink} download={`${activeTab?.title}.md`} onClick={download}>
                    Export to MD
                </a>
            </div>
        );
    }, [otherSiteBookmarks]);

    const renderVideoBookmarks = useMemo(() => {
        if (!videoBookmarks || videoBookmarks.length === 0) {
            return <div className={cls.emptyState}>No video bookmarks</div>;
        }

        return (
            <div className={cls.videoBookmarksList}>
                {videoBookmarks.map((bookmark) => (
                    <VideoBookmark
                        key={bookmark.time}
                        bookmark={bookmark}
                        onPlayBookmark={onPlayBookmark}
                        onDeleteBookmark={onDeleteBookmark}
                    />
                ))}
            </div>
        );
    }, [onDeleteBookmark, onPlayBookmark, videoBookmarks]);

    return (
        <div className={cls.app}>
            <div className={cls.windowHeader}>
                <span>&gt; rabbit_note</span>
                <span className={cls.status}>armed</span>
            </div>
            {!isShowAllNotes && (
                <>
                    <div className={cls.activePage}>{text}</div>
                    <div className={cls.bookmarkList}>
                        {renderVideoBookmarks}
                        {renderOtherBookmarks}
                    </div>
                    <div className={cls.footer}>
                        <button className={cls.secondaryButton} onClick={() => setIsShowAllNotes(true)}>
                            Show all notes
                        </button>
                    </div>
                </>
            )}
            {isShowAllNotes && (
                <>
                    <div className={cls.footer}>
                        <button className={cls.secondaryButton} onClick={() => setIsShowAllNotes(false)}>
                            Current page
                        </button>
                    </div>
                    <AllNotes />
                </>
            )}
        </div>
    );
};

export default App;
