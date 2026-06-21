import { OtherSiteBookmarkType } from '../types/types.ts';
import {
    applyExportTemplate,
    createDefaultBookmarksText,
    DEFAULT_EXPORT_TEMPLATE,
    formatExportDate,
} from './exportTemplate.ts';

export const getActiveTab = async () => {
    const queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
};

export const createDownloadBookmarksLink = (
    bookmarks: OtherSiteBookmarkType[],
    tabUrl?: string,
    returnMode: 'url' | 'content' = 'content',
    template: string = DEFAULT_EXPORT_TEMPLATE,
    pageTitle: string = '',
): string => {
    if (!bookmarks || bookmarks.length === 0) {
        return '';
    }

    const resultText = applyExportTemplate(template, {
        date: formatExportDate(),
        notes: createDefaultBookmarksText(bookmarks),
        pageTitle,
        pageUrl: tabUrl || '',
    });

    if (returnMode === 'content') return resultText;

    const blobText = new Blob([resultText], { type: 'text/markdown' });

    return URL.createObjectURL(blobText);
};
