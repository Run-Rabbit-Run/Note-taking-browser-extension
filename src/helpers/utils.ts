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

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const createProperties = `---\ntags:\n  - from_site\nсоздал заметку: ${formattedDate}\nLink: ${tabUrl}\n---\n`;

    const createText = bookmarks.reduce((acc, { selectedText, noteText }) => {
        const isCite = noteText.trim() === '';
        const separator = acc === '' ? '' : '---\n\n';
        const selected = `${selectedText
            .split(/\n+/)
            .map((paragraph) => `> ${paragraph}`)
            .join('\n')}\n\n`;
        const note = noteText + '\n\n';
        const text = isCite ? selected : selected + note;

        return acc + separator + text;
    }, '');

    const resultText = createProperties + createText;

    const blobText = new Blob([resultText], { type: 'text/markdown' });

    return URL.createObjectURL(blobText);
};
