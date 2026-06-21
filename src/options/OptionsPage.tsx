import { useEffect, useMemo, useState } from 'react';
import {
    DEFAULT_EXPORT_TEMPLATE,
    EXPORT_TEMPLATE_PLACEHOLDERS,
    getExportTemplateSettings,
    saveExportTemplateSettings,
} from '../helpers/exportTemplate.ts';
import type { ExportTemplateMode } from '../helpers/exportTemplate.ts';
import cls from './OptionsPage.module.scss';

const OptionsPage = () => {
    const [mode, setMode] = useState<ExportTemplateMode>('default');
    const [template, setTemplate] = useState(DEFAULT_EXPORT_TEMPLATE);
    const [isLoading, setIsLoading] = useState(true);
    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        getExportTemplateSettings()
            .then((settings) => {
                setMode(settings.mode);
                setTemplate(settings.template);
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
                                Choose the default MD export template or save a custom one.
                            </p>
                        </div>
                        {statusText && <span className={cls.inlineStatus}>{statusText}</span>}
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
