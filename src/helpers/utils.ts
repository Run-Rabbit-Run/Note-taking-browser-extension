import { OtherSiteBookmarkType } from '../types/types.ts';
import {
    applyExportTemplate,
    createDefaultBookmarksText,
    DEFAULT_EXPORT_TEMPLATE,
    formatExportDate,
} from './exportTemplate.ts';

const DEFAULT_EXPORT_FILE_NAME = 'rabbit-note';

export const createSafePathSegment = (value: string, fallback: string = DEFAULT_EXPORT_FILE_NAME) => {
    const safeValue = value
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);

    return safeValue || fallback;
};

export const createMarkdownFileName = (title?: string) => {
    return `${createSafePathSegment(title || DEFAULT_EXPORT_FILE_NAME)}.md`;
};

export const getActiveTab = async () => {
    const queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
};

export const createBookmarksMarkdown = (
    bookmarks: OtherSiteBookmarkType[],
    tabUrl?: string,
    template: string = DEFAULT_EXPORT_TEMPLATE,
    pageTitle: string = '',
): string => {
    if (!bookmarks || bookmarks.length === 0) {
        return '';
    }

    return applyExportTemplate(template, {
        date: formatExportDate(),
        notes: createDefaultBookmarksText(bookmarks),
        pageTitle,
        pageUrl: tabUrl || '',
    });
};

export const createDownloadBookmarksLink = (
    bookmarks: OtherSiteBookmarkType[],
    tabUrl?: string,
    returnMode: 'url' | 'content' = 'content',
    template: string = DEFAULT_EXPORT_TEMPLATE,
    pageTitle: string = '',
): string => {
    const resultText = createBookmarksMarkdown(bookmarks, tabUrl, template, pageTitle);

    if (!resultText || returnMode === 'content') return resultText;

    const blobText = new Blob([resultText], { type: 'text/markdown' });

    return URL.createObjectURL(blobText);
};
