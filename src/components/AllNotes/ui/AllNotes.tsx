import cls from './AllNotes.module.scss';
import { useEffect, useState } from 'react';
import { createDownloadBookmarksLink, getActiveTab } from '../../../helpers/utils.ts';
import { OtherSiteBookmarkType, VideoBookmarkType } from '../../../types/types.ts';
import { TextBookmark } from '../../TextBookmark';
import { VideoBookmark } from '../../VideoBookmark';
import { isOtherSiteBookmarks, isVideoBookmark } from '../../../helpers/typeUtils.ts';
import Tab = chrome.tabs.Tab;

const AllNotes = () => {
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [store, setStore] = useState<Record<string, VideoBookmarkType[] | OtherSiteBookmarkType[]>>({});

    const getBookmarksFromStorage = async () => {
        const tab = (await getActiveTab()) || activeTab;
        setActiveTab(tab);

        chrome.storage.sync.get().then((data) => {
            Object.values(data).map(
                (bookmark) => JSON.parse(bookmark) as VideoBookmarkType[] | OtherSiteBookmarkType[],
            );

            const parsedData: Record<string, VideoBookmarkType[] | OtherSiteBookmarkType[]> = {};

            Object.keys(data).forEach((key) => {
                parsedData[key] = JSON.parse(data[key]);
            });

            setStore(parsedData);
        });
    };

    const onDownloadText = () => {
        Object.values(store).map((bookmarks) => {
            if (isOtherSiteBookmarks(bookmarks)) {
                const url = createDownloadBookmarksLink(bookmarks, bookmarks[0].pageUrl);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${bookmarks[0].pageTitle}.md`);
                link.setAttribute('target', '_blank');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                link.remove();
                URL.revokeObjectURL(url);
            }
        });
    };

    useEffect(() => {
        getBookmarksFromStorage().catch(console.error);
    }, []);

    return (
        <div className={cls.wrapper}>
            {Object.values(store).map((bookmarks) => {
                if (!bookmarks || !bookmarks.length) return null;

                const firstBookmark = bookmarks[0];
                const isVideoList = isVideoBookmark(firstBookmark);

                return (
                    <details className={cls.pageBookmarks}>
                        <summary className={isVideoList ? cls.pageTitleVideo : cls.pageTitleText}>
                            {firstBookmark.pageTitle}
                        </summary>
                        <a className={cls.pageLink} href={firstBookmark.pageUrl} target="_blank">
                            Link
                        </a>
                        <div className={cls.bookmarksList}>
                            {bookmarks.map((bookmark) => {
                                if (isVideoBookmark(bookmark)) {
                                    return <VideoBookmark key={bookmark.time} bookmark={bookmark} />;
                                } else {
                                    return <TextBookmark key={bookmark.selectedText} bookmark={bookmark} />;
                                }
                            })}
                        </div>
                    </details>
                );
            })}
            <button onClick={onDownloadText}>Download text</button>
        </div>
    );
};

export default AllNotes;
