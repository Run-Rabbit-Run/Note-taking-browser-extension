import cls from './AllNotes.module.scss';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveTab } from '../../../helpers/utils.ts';
import { BookmarkType, OtherSiteBookmarkType, VideoBookmarkType } from '../../../types/types.ts';
import { TextBookmark } from '../../TextBookmark';
import { VideoBookmark } from '../../VideoBookmark';
import { OverflowTooltip } from '../../OverflowTooltip';
import { isVideoBookmark } from '../../../helpers/typeUtils.ts';
import Tab = chrome.tabs.Tab;

type PageBookmarks = VideoBookmarkType[] | OtherSiteBookmarkType[];
type GroupMode = 'page' | 'domain';

type PageBookmarksGroup = {
    bookmarks: PageBookmarks;
    domain: string;
    isVideoList: boolean;
    notesCount: number;
    pageTitle: string;
    pageUrl: string;
};

const COMMON_SECOND_LEVEL_TLDS = new Set(['ac', 'co', 'com', 'edu', 'gov', 'net', 'org']);

const getDomainName = (pageUrl: string) => {
    try {
        const hostname = new URL(pageUrl).hostname.toLowerCase().replace(/^www\./, '');
        const parts = hostname.split('.').filter(Boolean);

        if (parts.length <= 2) return hostname || 'unknown-domain';

        const secondLevelDomain = parts[parts.length - 2];
        const topLevelDomain = parts[parts.length - 1];
        const isCountryCodeDomain = topLevelDomain.length === 2;
        const isCommonSecondLevelDomain = COMMON_SECOND_LEVEL_TLDS.has(secondLevelDomain);

        if (isCountryCodeDomain && isCommonSecondLevelDomain && parts.length >= 3) {
            return parts.slice(-3).join('.');
        }

        return parts.slice(-2).join('.');
    } catch {
        return 'unknown-domain';
    }
};

const AllNotes = () => {
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [store, setStore] = useState<Record<string, PageBookmarks>>({});
    const [groupMode, setGroupMode] = useState<GroupMode>('page');

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

    const onOpenBookmark = useCallback((bookmark: BookmarkType) => {
        chrome.runtime
            .sendMessage({
                type: 'OPEN_BOOKMARK_IN_NEW_TAB',
                bookmark,
            })
            .catch(() => undefined);
    }, []);

    const pageGroups = useMemo(() => {
        return Object.values(store)
            .reduce<PageBookmarksGroup[]>((acc, bookmarks) => {
                if (!bookmarks || !bookmarks.length) return acc;

                const firstBookmark = bookmarks[0];

                acc.push({
                    bookmarks,
                    domain: getDomainName(firstBookmark.pageUrl),
                    isVideoList: isVideoBookmark(firstBookmark),
                    notesCount: bookmarks.length,
                    pageTitle: firstBookmark.pageTitle,
                    pageUrl: firstBookmark.pageUrl,
                });

                return acc;
            }, [])
            .sort((a, b) => {
                const domainCompare = a.domain.localeCompare(b.domain);

                return domainCompare || a.pageTitle.localeCompare(b.pageTitle);
            });
    }, [store]);

    const domainGroups = useMemo(() => {
        return pageGroups.reduce<Record<string, PageBookmarksGroup[]>>((acc, pageGroup) => {
            if (!acc[pageGroup.domain]) {
                acc[pageGroup.domain] = [];
            }

            acc[pageGroup.domain].push(pageGroup);

            return acc;
        }, {});
    }, [pageGroups]);

    const renderBookmark = useCallback((bookmark: BookmarkType) => {
        if (isVideoBookmark(bookmark)) {
            return (
                <VideoBookmark
                    key={bookmark.time}
                    bookmark={bookmark}
                    onOpenBookmark={onOpenBookmark}
                />
            );
        }

        return (
            <TextBookmark
                key={bookmark.selectedText}
                bookmark={bookmark}
                onOpen={onOpenBookmark}
            />
        );
    }, [onOpenBookmark]);

    const renderPageGroup = useCallback((pageGroup: PageBookmarksGroup) => {
        return (
            <details key={pageGroup.pageUrl} className={cls.pageBookmarks}>
                <summary className={pageGroup.isVideoList ? cls.pageTitleVideo : cls.pageTitleText}>
                    <OverflowTooltip className={cls.pageTitle} text={pageGroup.pageTitle} />
                    <span className={cls.pageMeta}>{pageGroup.notesCount}</span>
                </summary>
                <a className={cls.pageLink} href={pageGroup.pageUrl} target="_blank">
                    Link
                </a>
                <div className={cls.bookmarksList}>
                    {pageGroup.bookmarks.map(renderBookmark)}
                </div>
            </details>
        );
    }, [renderBookmark]);

    useEffect(() => {
        getBookmarksFromStorage().catch(console.error);
    }, []);

    return (
        <div className={cls.wrapper}>
            <div className={cls.groupControls} role="group" aria-label="Group notes">
                <button
                    type="button"
                    className={groupMode === 'page' ? `${cls.groupButton} ${cls.groupButtonActive}` : cls.groupButton}
                    onClick={() => setGroupMode('page')}
                >
                    By page
                </button>
                <button
                    type="button"
                    className={
                        groupMode === 'domain' ? `${cls.groupButton} ${cls.groupButtonActive}` : cls.groupButton
                    }
                    onClick={() => setGroupMode('domain')}
                >
                    By domain
                </button>
            </div>

            {pageGroups.length === 0 && <div className={cls.emptyState}>No notes</div>}

            {groupMode === 'page' && pageGroups.map(renderPageGroup)}

            {groupMode === 'domain' &&
                Object.entries(domainGroups).map(([domain, domainPageGroups]) => {
                    const notesCount = domainPageGroups.reduce((acc, pageGroup) => acc + pageGroup.notesCount, 0);

                    return (
                        <details key={domain} className={cls.domainBookmarks} open>
                            <summary className={cls.domainTitle}>
                                <span>{domain}</span>
                                <span className={cls.domainMeta}>
                                    {domainPageGroups.length} pages / {notesCount} notes
                                </span>
                            </summary>
                            <div className={cls.domainPages}>
                                {domainPageGroups.map(renderPageGroup)}
                            </div>
                        </details>
                    );
                })
            }
        </div>
    );
};

export default AllNotes;
