import { OtherSiteBookmarkType } from '../types/types.ts';

export const getActiveTab = async () => {
    const queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
};

export const createDownloadBookmarksLink = (bookmarks: OtherSiteBookmarkType[], tabUrl?: string): string => {
    if (!bookmarks || bookmarks.length === 0) {
        return '';
    }

    const createText = bookmarks.reduce((acc, { selectedText, noteText }) => {
        const separator = acc === '' ? '' : '---\n\n';
        const selected = '# Selected text\n' + selectedText + '\n\n';
        const note = '# Note text\n' + noteText + '\n\n';
        return acc + separator + selected + note;
    }, '');

    const createLink = `Link: ${tabUrl}\n\n`;

    const resultText = createLink + createText;

    const blobText = new Blob([resultText], { type: 'text/markdown' });

    return URL.createObjectURL(blobText);
};
