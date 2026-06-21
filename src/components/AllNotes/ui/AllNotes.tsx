import cls from './AllNotes.module.scss';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    createBookmarksMarkdown,
    createMarkdownFileName,
    createSafePathSegment,
    getActiveTab,
} from '../../../helpers/utils.ts';
import { BookmarkType, OtherSiteBookmarkType, VideoBookmarkType } from '../../../types/types.ts';
import { TextBookmark } from '../../TextBookmark';
import { VideoBookmark } from '../../VideoBookmark';
import { OverflowTooltip } from '../../OverflowTooltip';
import { isOtherSiteBookmarks, isVideoBookmark } from '../../../helpers/typeUtils.ts';
import { formatExportDate, getEffectiveExportTemplate, isExportTemplateStorageKey } from '../../../helpers/exportTemplate.ts';
import { writeMarkdownFilesToExportDirectory } from '../../../helpers/exportDirectory.ts';
import Tab = chrome.tabs.Tab;

type PageBookmarks = VideoBookmarkType[] | OtherSiteBookmarkType[];
type GroupMode = 'page' | 'domain';
type ExportStatusTone = 'progress' | 'success' | 'error';

type ExportStatus = {
    message: string;
    tone: ExportStatusTone;
};

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

const parseStoredBookmarks = (value: unknown): PageBookmarks | null => {
    if (typeof value !== 'string') return null;

    try {
        const parsedValue = JSON.parse(value);

        if (!Array.isArray(parsedValue) || parsedValue.length === 0) return null;

        const firstBookmark = parsedValue[0] as Partial<BookmarkType>;

        if (
            !firstBookmark ||
            typeof firstBookmark !== 'object' ||
            typeof firstBookmark.pageTitle !== 'string' ||
            typeof firstBookmark.pageUrl !== 'string'
        ) {
            return null;
        }

        return parsedValue as PageBookmarks;
    } catch {
        return null;
    }
};

const formatTimestamp = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const createVideoBookmarksMarkdown = (
    bookmarks: VideoBookmarkType[],
    pageUrl: string,
    pageTitle: string,
) => {
    const notes = bookmarks
        .map((bookmark) => {
            const timestampUrl = `${pageUrl}${pageUrl.includes('?') ? '&' : '?'}t=${Math.floor(bookmark.time)}s`;
            const note = bookmark.noteText.trim() ? `\n${bookmark.noteText.trim()}` : '';

            return `- [${bookmark.desc || formatTimestamp(bookmark.time)}](${timestampUrl})${note}`;
        })
        .join('\n\n');

    return `---
tags:
  - from_video
created: ${formatExportDate()}
Link: ${pageUrl}
---
# ${pageTitle}

${notes}
`;
};

const getUniqueFileName = (fileName: string, usedFileNames: Set<string>) => {
    if (!usedFileNames.has(fileName)) {
        usedFileNames.add(fileName);
        return fileName;
    }

    const extensionIndex = fileName.lastIndexOf('.');
    const baseName = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
    const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : '';
    let suffix = 2;
    let uniqueFileName = `${baseName}-${suffix}${extension}`;

    while (usedFileNames.has(uniqueFileName)) {
        suffix += 1;
        uniqueFileName = `${baseName}-${suffix}${extension}`;
    }

    usedFileNames.add(uniqueFileName);

    return uniqueFileName;
};

const AllNotes = () => {
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [store, setStore] = useState<Record<string, PageBookmarks>>({});
    const [groupMode, setGroupMode] = useState<GroupMode>('page');
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);

    const getBookmarksFromStorage = async () => {
        const tab = (await getActiveTab()) || activeTab;
        setActiveTab(tab);

        chrome.storage.sync.get().then((data) => {
            const parsedData: Record<string, PageBookmarks> = {};

            Object.entries(data).forEach(([key, value]) => {
                if (isExportTemplateStorageKey(key)) return;

                const bookmarks = parseStoredBookmarks(value);

                if (bookmarks) {
                    parsedData[key] = bookmarks;
                }
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

    const onExportAllNotes = async () => {
        if (isExporting) return;

        setIsExporting(true);
        setExportStatus({
            message: 'Preparing all notes export...',
            tone: 'progress',
        });

        try {
            const exportTemplate = await getEffectiveExportTemplate();
            const usedFileNamesByDomain: Record<string, Set<string>> = {};
            const files = pageGroups.reduce<Array<{ content: string; directoryPath: string[]; fileName: string }>>(
                (acc, pageGroup) => {
                    const domainDirectory = createSafePathSegment(pageGroup.domain, 'unknown-domain');
                    const usedFileNames = usedFileNamesByDomain[domainDirectory] || new Set<string>();
                    const baseFileName = createMarkdownFileName(pageGroup.pageTitle);
                    const fileName = getUniqueFileName(baseFileName, usedFileNames);
                    const content = isOtherSiteBookmarks(pageGroup.bookmarks)
                        ? createBookmarksMarkdown(
                            pageGroup.bookmarks,
                            pageGroup.pageUrl,
                            exportTemplate,
                            pageGroup.pageTitle,
                        )
                        : createVideoBookmarksMarkdown(
                            pageGroup.bookmarks,
                            pageGroup.pageUrl,
                            pageGroup.pageTitle,
                        );

                    usedFileNamesByDomain[domainDirectory] = usedFileNames;

                    if (!content) return acc;

                    acc.push({
                        content,
                        directoryPath: [domainDirectory],
                        fileName,
                    });

                    return acc;
                },
                [],
            );

            if (files.length === 0) {
                setExportStatus({
                    message: 'Nothing to export',
                    tone: 'error',
                });
                return;
            }

            const writeResult = await writeMarkdownFilesToExportDirectory(files);

            if (writeResult.result === 'written') {
                setExportStatus({
                    message: `Exported ${writeResult.writtenCount} files`,
                    tone: 'success',
                });
                return;
            }

            if (writeResult.result === 'not-configured') {
                setExportStatus({
                    message: 'Choose a default export folder in settings first',
                    tone: 'error',
                });
                return;
            }

            if (writeResult.result === 'unsupported') {
                setExportStatus({
                    message: 'This browser cannot save multiple files to a selected folder',
                    tone: 'error',
                });
                return;
            }

            if (writeResult.result === 'permission-denied') {
                setExportStatus({
                    message: 'Export folder permission was denied. Choose the folder again in settings',
                    tone: 'error',
                });
                return;
            }

            setExportStatus({
                message: `Exported ${writeResult.writtenCount} files, failed ${writeResult.failedCount}`,
                tone: writeResult.writtenCount > 0 ? 'success' : 'error',
            });
        } catch (error) {
            setExportStatus({
                message: error instanceof Error ? error.message : 'All notes export failed',
                tone: 'error',
            });
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        getBookmarksFromStorage().catch(console.error);
    }, []);

    return (
        <div className={cls.wrapper}>
            <div className={cls.exportPanel}>
                <button
                    type="button"
                    className={cls.exportButton}
                    disabled={isExporting || pageGroups.length === 0}
                    onClick={onExportAllNotes}
                >
                    {isExporting ? 'Exporting...' : 'Export all notes'}
                </button>
                {exportStatus && (
                    <div className={`${cls.exportStatus} ${cls[`exportStatus_${exportStatus.tone}`]}`}>
                        {exportStatus.message}
                    </div>
                )}
            </div>

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
