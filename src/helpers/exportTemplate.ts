import type { OtherSiteBookmarkType } from '../types/types.ts';

export const EXPORT_TEMPLATE_MODE_STORAGE_KEY = '__rabbit_note_export_template_mode';
export const EXPORT_TEMPLATE_STORAGE_KEY = '__rabbit_note_export_template';
export const EXPORT_TEMPLATE_STORAGE_KEYS = [
    EXPORT_TEMPLATE_MODE_STORAGE_KEY,
    EXPORT_TEMPLATE_STORAGE_KEY,
] as const;

export type ExportTemplateMode = 'default' | 'custom';

export type ExportTemplateSettings = {
    mode: ExportTemplateMode;
    template: string;
};

export type ExportTemplateContext = {
    date: string;
    notes: string;
    pageTitle: string;
    pageUrl: string;
};

export const DEFAULT_EXPORT_TEMPLATE = `---
tags:
  - from_site
создал заметку: {{date}}
Link: {{pageUrl}}
---
{{notes}}`;

export const EXPORT_TEMPLATE_PLACEHOLDERS = [
    '{{date}}',
    '{{pageUrl}}',
    '{{pageTitle}}',
    '{{notes}}',
] as const;

export const isExportTemplateStorageKey = (key: string) => {
    return EXPORT_TEMPLATE_STORAGE_KEYS.includes(key as typeof EXPORT_TEMPLATE_STORAGE_KEYS[number]);
};

export const createDefaultBookmarksText = (bookmarks: OtherSiteBookmarkType[]) => {
    return bookmarks.reduce((acc, { selectedText, noteText }) => {
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
};

export const formatExportDate = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const replacePlaceholder = (template: string, placeholder: keyof ExportTemplateContext, value: string) => {
    return template.split(`{{${placeholder}}}`).join(value);
};

export const applyExportTemplate = (template: string, context: ExportTemplateContext) => {
    const templateWithNotes = template.includes('{{notes}}') ? template : `${template.trimEnd()}\n\n{{notes}}`;

    return (Object.keys(context) as Array<keyof ExportTemplateContext>).reduce((result, placeholder) => {
        return replacePlaceholder(result, placeholder, context[placeholder]);
    }, templateWithNotes);
};

export const getExportTemplateSettings = async (): Promise<ExportTemplateSettings> => {
    const data = await chrome.storage.sync.get(EXPORT_TEMPLATE_STORAGE_KEYS);
    const mode = data[EXPORT_TEMPLATE_MODE_STORAGE_KEY] === 'custom' ? 'custom' : 'default';
    const template = typeof data[EXPORT_TEMPLATE_STORAGE_KEY] === 'string'
        ? data[EXPORT_TEMPLATE_STORAGE_KEY]
        : DEFAULT_EXPORT_TEMPLATE;

    return { mode, template };
};

export const getEffectiveExportTemplate = async () => {
    const { mode, template } = await getExportTemplateSettings();

    if (mode === 'custom' && template.trim()) {
        return template;
    }

    return DEFAULT_EXPORT_TEMPLATE;
};

export const saveExportTemplateSettings = async (settings: ExportTemplateSettings) => {
    await chrome.storage.sync.set({
        [EXPORT_TEMPLATE_MODE_STORAGE_KEY]: settings.mode,
        [EXPORT_TEMPLATE_STORAGE_KEY]: settings.template,
    });
};
