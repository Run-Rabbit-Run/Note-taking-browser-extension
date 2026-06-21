import { useEffect, useMemo, useState } from 'react';
import {
    DEFAULT_EXPORT_TEMPLATE,
    EXPORT_TEMPLATE_PLACEHOLDERS,
    getExportTemplateSettings,
    saveExportTemplateSettings,
} from '../helpers/exportTemplate.ts';
import {
    chooseExportDirectory,
    clearExportDirectory,
    getExportDirectoryName,
    isExportDirectoryPickerSupported,
} from '../helpers/exportDirectory.ts';
import type { ExportTemplateMode } from '../helpers/exportTemplate.ts';
import cls from './OptionsPage.module.scss';

const OptionsPage = () => {
    const [mode, setMode] = useState<ExportTemplateMode>('default');
    const [template, setTemplate] = useState(DEFAULT_EXPORT_TEMPLATE);
    const [isLoading, setIsLoading] = useState(true);
    const [statusText, setStatusText] = useState('');
    const [exportDirectoryName, setExportDirectoryName] = useState('');
    const [isDirectoryPickerSupported, setIsDirectoryPickerSupported] = useState(false);

    useEffect(() => {
        setIsDirectoryPickerSupported(isExportDirectoryPickerSupported());

        Promise.all([getExportTemplateSettings(), getExportDirectoryName()])
            .then(([settings, directoryName]) => {
                setMode(settings.mode);
                setTemplate(settings.template);
                setExportDirectoryName(directoryName);
            })
            .catch(() => {
                setStatusText('Failed to load settings');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const displayedTemplate = useMemo(() => {
        return mode === 'default' ? DEFAULT_EXPORT_TEMPLATE : template;
    }, [mode, template]);

    const canSave = mode === 'default' || template.trim().length > 0;

    const onSave = async () => {
        if (!canSave) return;

        await saveExportTemplateSettings({
            mode,
            template: template.trim() ? template : DEFAULT_EXPORT_TEMPLATE,
        });
        setStatusText('Saved');
    };

    const onUseDefault = async () => {
        setMode('default');
        setTemplate(DEFAULT_EXPORT_TEMPLATE);
        await saveExportTemplateSettings({
            mode: 'default',
            template: DEFAULT_EXPORT_TEMPLATE,
        });
        setStatusText('Default template is active');
    };

    const onChooseDirectory = async () => {
        if (!isDirectoryPickerSupported) {
            setStatusText('Folder picker is not supported in this browser');
            return;
        }

        try {
            const directoryName = await chooseExportDirectory();

            setExportDirectoryName(directoryName);
            setStatusText('Export folder saved');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;

            setStatusText('Failed to save export folder');
        }
    };

    const onClearDirectory = async () => {
        await clearExportDirectory();
        setExportDirectoryName('');
        setStatusText('Export folder cleared');
    };

    return (
        <main className={cls.page}>
            <div className={cls.shell}>
                <header className={cls.header}>
                    <h1 className={cls.title}>&gt; rabbit_note settings</h1>
                    <span className={cls.status}>armed</span>
                </header>

                <section className={cls.section}>
                    <div className={cls.sectionHeader}>
                        <div>
                            <h2 className={cls.sectionTitle}>Markdown export</h2>
                            <p className={cls.sectionText}>
                                Choose the default folder and template for MD exports.
                            </p>
                        </div>
                        {statusText && <span className={cls.inlineStatus}>{statusText}</span>}
                    </div>

                    <div className={cls.destinationPanel}>
                        <div className={cls.destinationInfo}>
                            <span className={cls.fieldLabel}>Default export folder</span>
                            <span className={cls.directoryValue}>
                                {exportDirectoryName || 'Not selected'}
                            </span>
                            <p className={cls.sectionText}>
                                {isDirectoryPickerSupported
                                    ? 'Exports use this folder when browser permission is available.'
                                    : 'This browser cannot save directly to a selected folder.'}
                            </p>
                        </div>
                        <div className={cls.destinationActions}>
                            <button
                                type="button"
                                className={cls.secondaryButton}
                                disabled={isLoading || !isDirectoryPickerSupported}
                                onClick={onChooseDirectory}
                            >
                                Choose folder
                            </button>
                            <button
                                type="button"
                                className={cls.secondaryButton}
                                disabled={isLoading || !exportDirectoryName}
                                onClick={onClearDirectory}
                            >
                                Clear folder
                            </button>
                        </div>
                    </div>

                    <div className={cls.modeGroup} role="radiogroup" aria-label="Export template mode">
                        <label className={mode === 'default' ? `${cls.modeCard} ${cls.modeCardActive}` : cls.modeCard}>
                            <input
                                type="radio"
                                name="exportTemplateMode"
                                checked={mode === 'default'}
                                onChange={() => setMode('default')}
                            />
                            <span>Use default</span>
                        </label>
                        <label className={mode === 'custom' ? `${cls.modeCard} ${cls.modeCardActive}` : cls.modeCard}>
                            <input
                                type="radio"
                                name="exportTemplateMode"
                                checked={mode === 'custom'}
                                onChange={() => setMode('custom')}
                            />
                            <span>Custom template</span>
                        </label>
                    </div>

                    <label className={cls.field}>
                        <span className={cls.fieldLabel}>Template</span>
                        <textarea
                            className={cls.templateTextarea}
                            value={displayedTemplate}
                            readOnly={mode === 'default' || isLoading}
                            rows={14}
                            spellCheck={false}
                            onChange={(event) => setTemplate(event.target.value)}
                        />
                    </label>

                    <div className={cls.placeholderList} aria-label="Available placeholders">
                        {EXPORT_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                            <code key={placeholder} className={cls.placeholder}>
                                {placeholder}
                            </code>
                        ))}
                    </div>

                    <div className={cls.actions}>
                        <button
                            type="button"
                            className={cls.primaryButton}
                            disabled={isLoading || !canSave}
                            onClick={onSave}
                        >
                            Save settings
                        </button>
                        <button
                            type="button"
                            className={cls.secondaryButton}
                            disabled={isLoading}
                            onClick={onUseDefault}
                        >
                            Reset to default
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default OptionsPage;
