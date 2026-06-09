import cls from './OptionsPage.module.scss';

const OptionsPage = () => {
    return (
        <main className={cls.page}>
            <div className={cls.shell}>
                <header className={cls.header}>
                    <h1 className={cls.title}>&gt; rabbit_note settings</h1>
                    <span className={cls.status}>armed</span>
                </header>

                <section className={cls.section}>
                    <h2 className={cls.sectionTitle}>General</h2>
                    <p className={cls.sectionText}>
                        Extension settings will appear here.
                    </p>
                </section>
            </div>
        </main>
    );
};

export default OptionsPage;
