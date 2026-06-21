import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBookmarksMarkdown, getActiveTab } from './helpers/utils.ts';
import { getEffectiveExportTemplate } from './helpers/exportTemplate.ts';
import { writeMarkdownToExportDirectory } from './helpers/exportDirectory.ts';
import { OtherSiteBookmarkType, VideoBookmarkType } from './types/types.ts';
import cls from './App.module.scss';
import { TextBookmark } from './components/TextBookmark';
import { AllNotes } from './components/AllNotes';
import { OverflowTooltip } from './components/OverflowTooltip';
import VideoBookmark from './components/VideoBookmark/ui/VideoBookmark.tsx';
import SettingsIcon from './assets/settings.svg?react';
import Tab = chrome.tabs.Tab;

const DEFAULT_EXPORT_FILE_NAME = 'rabbit-note';

type ExportStatusTone = 'progress' | 'success' | 'error';

type ExportStatus = {
    message: string;
    tone: ExportStatusTone;
};

const createMarkdownFileName = (title?: string) => {
    const safeTitle = (title || DEFAULT_EXPORT_FILE_NAME)
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);

    return `${safeTitle || DEFAULT_EXPORT_FILE_NAME}.md`;
};

const waitForDownloadCompletion = (downloadId: number) => {
    return new Promise<'complete' | 'interrupted'>((resolve) => {
        const listener = (downloadDelta: chrome.downloads.DownloadDelta) => {
            if (downloadDelta.id !== downloadId || !downloadDelta.state?.current) return;

            const downloadState = downloadDelta.state.current;

            if (downloadState !== 'complete' && downloadState !== 'interrupted') return;

            chrome.downloads.onChanged.removeListener(listener);
            resolve(downloadState);
        };

        chrome.downloads.onChanged.addListener(listener);
    });
};

const downloadMarkdownWithSaveDialog = (url: string, fileName: string) => {
    return new Promise<number>((resolve, reject) => {
        chrome.downloads.download({
            url,
            filename: fileName,
            saveAs: true,
        }, (downloadId) => {
            const downloadError = chrome.runtime.lastError;

            if (downloadError || typeof downloadId !== 'number') {
                reject(new Error(downloadError?.message || 'Failed to start download'));
                return;
            }

            resolve(downloadId);
        });
    });
};

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
    const [currentVideoId, setCurrentVideoId] = useState('');
    const [videoBookmarks, setVideoBookmarks] = useState<VideoBookmarkType[]>([]);
    const [otherSiteBookmarks, setOtherSiteBookmarks] = useState<OtherSiteBookmarkType[]>([]);
    const [text, setText] = useState('');
    const [isShowAllNotes, setIsShowAllNotes] = useState(false);
    const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const getBookmarksFromStorage = async () => {
        const tab = (await getActiveTab()) || activeTab;
        setActiveTab(tab);
        const queryParameters = tab?.url?.split('?')[1];
        const urlParameters = new URLSearchParams(queryParameters);
        const currentVideoId = urlParameters.get('v');

        if (tab?.url?.includes('youtube.com/watch') && currentVideoId) {
            setCurrentVideoId(currentVideoId);
            setText(tab?.title || 'Where is my title?');
            chrome.storage.sync.get([currentVideoId], (data) => {
                const currentVideoBookmarks = data[currentVideoId] ? JSON.parse(data[currentVideoId]) : [];

                setVideoBookmarks(currentVideoBookmarks);
            });
        } else {
            setCurrentVideoId('');
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
        async (bookmark: VideoBookmarkType) => {
            const updatedBookmarks = videoBookmarks.filter((currentBookmark) => currentBookmark.time !== bookmark.time);

            setVideoBookmarks(updatedBookmarks);

            if (currentVideoId) {
                await chrome.storage.sync.set({ [currentVideoId]: JSON.stringify(updatedBookmarks) });
            }
        },
        [currentVideoId, videoBookmarks],
    );

    const onEditVideoBookmark = useCallback(
        async (bookmark: VideoBookmarkType) => {
            if (!currentVideoId) return;

            const updatedBookmarks = videoBookmarks.map((currentBookmark) => {
                if (currentBookmark.time !== bookmark.time) return currentBookmark;

                return {
                    ...currentBookmark,
                    ...bookmark,
                };
            });

            setVideoBookmarks(updatedBookmarks);
            await chrome.storage.sync.set({ [currentVideoId]: JSON.stringify(updatedBookmarks) });
        },
        [currentVideoId, videoBookmarks],
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

    const onOpenOtherBookmark = useCallback(
        (bookmark: OtherSiteBookmarkType) => {
            chrome.tabs
                .sendMessage(activeTab?.id || 0, {
                    type: 'SCROLL_TO_OTHER_SITE_BOOKMARK',
                    value: bookmark.selectedText,
                    selectedTextPosition: bookmark.selectedTextPosition,
                })
                .catch(() => undefined);
        },
        [activeTab?.id],
    );

    const onEditOtherBookmark = useCallback(
        async (bookmark: OtherSiteBookmarkType) => {
            const { selectedText, selectedTextPosition, noteText, pageTitle, pageUrl } = bookmark;

            const editedBookmark = otherSiteBookmarks.find((bookmark) => bookmark.selectedText === selectedText);

            if (editedBookmark) {
                editedBookmark.noteText = noteText;
                const newBookmark = {
                    selectedText,
                    selectedTextPosition,
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

    const openSettings = () => {
        chrome.runtime.openOptionsPage();
    };

    const renderOtherBookmarks = useMemo(() => {
        if (!otherSiteBookmarks || otherSiteBookmarks.length === 0) {
            return <div className={cls.emptyState}>No other bookmarks</div>;
        }

        const download = async () => {
            if (isExporting) return;

            setIsExporting(true);
            setExportStatus({
                message: 'Preparing export...',
                tone: 'progress',
            });

            try {
                const exportTemplate = await getEffectiveExportTemplate();
                const markdownContent = createBookmarksMarkdown(
                    otherSiteBookmarks,
                    activeTab?.url,
                    exportTemplate,
                    activeTab?.title,
                );
                const fileName = createMarkdownFileName(activeTab?.title);

                if (!markdownContent) {
                    setExportStatus({
                        message: 'Nothing to export',
                        tone: 'error',
                    });
                    return;
                }

                const writeResult = await writeMarkdownToExportDirectory(fileName, markdownContent);

                if (writeResult === 'written') {
                    setExportStatus({
                        message: `Saved: ${fileName}`,
                        tone: 'success',
                    });
                    return;
                }

                const url = URL.createObjectURL(new Blob([markdownContent], { type: 'text/markdown' }));

                setExportStatus({
                    message: writeResult === 'permission-denied' || writeResult === 'failed'
                        ? 'Selected folder is unavailable. Opening save dialog...'
                        : 'Opening save dialog...',
                    tone: 'progress',
                });

                try {
                    const downloadId = await downloadMarkdownWithSaveDialog(url, fileName);

                    setExportStatus({
                        message: `Download started: ${fileName}`,
                        tone: 'progress',
                    });

                    const downloadState = await waitForDownloadCompletion(downloadId);

                    setExportStatus({
                        message: downloadState === 'complete'
                            ? `Downloaded: ${fileName}`
                            : 'Download was interrupted',
                        tone: downloadState === 'complete' ? 'success' : 'error',
                    });
                } finally {
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                setExportStatus({
                    message: error instanceof Error ? error.message : 'Export failed',
                    tone: 'error',
                });
            } finally {
                setIsExporting(false);
            }
        };

        return (
            <div className={cls.otherBookmarksList}>
                {otherSiteBookmarks.map((bookmark) => (
                    <TextBookmark
                        key={bookmark.selectedText}
                        bookmark={bookmark}
                        onEdit={onEditOtherBookmark}
                        onDelete={onDeleteOtherBookmark}
                        onOpen={onOpenOtherBookmark}
                    />
                ))}
                <button type="button" className={cls.exportLink} disabled={isExporting} onClick={download}>
                    {isExporting ? 'Exporting...' : 'Export to MD'}
                </button>
                {exportStatus && (
                    <div className={`${cls.exportStatus} ${cls[`exportStatus_${exportStatus.tone}`]}`}>
                        {exportStatus.message}
                    </div>
                )}
            </div>
        );
    }, [
        activeTab?.title,
        activeTab?.url,
        exportStatus,
        isExporting,
        onDeleteOtherBookmark,
        onEditOtherBookmark,
        onOpenOtherBookmark,
        otherSiteBookmarks,
    ]);

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
                        onEditBookmark={onEditVideoBookmark}
                        onPlayBookmark={onPlayBookmark}
                        onDeleteBookmark={onDeleteBookmark}
                    />
                ))}
            </div>
        );
    }, [onDeleteBookmark, onEditVideoBookmark, onPlayBookmark, videoBookmarks]);

    return (
        <div className={cls.app}>
            <div className={cls.windowHeader}>
                <span>&gt; rabbit_note</span>
                <div className={cls.headerActions}>
                    <span className={cls.status}>armed</span>
                    <button
                        type="button"
                        className={cls.settingsButton}
                        title="Settings"
                        aria-label="Open settings"
                        onClick={openSettings}
                    >
                        <SettingsIcon className={cls.settingsIcon} />
                    </button>
                </div>
            </div>
            {!isShowAllNotes && (
                <>
                    <OverflowTooltip className={cls.activePage} text={text} />
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
