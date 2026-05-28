export const createNoteEditorPopup = (
    selectedText: string,
    addNewOtherSiteBookmark: (selectedText: string, noteText: string) => void,
) => {
    const noteEditor = document.createElement('div');
    let closePopupOnOutsideClick: ((event: MouseEvent) => void) | null = null;

    const closeNoteEditor = () => {
        noteEditor.remove();

        if (closePopupOnOutsideClick) {
            document.removeEventListener('click', closePopupOnOutsideClick);
        }
    };

    Object.assign(noteEditor.style, {
        display: 'flex',
        width: '360px',
        maxWidth: 'calc(100vw - 32px)',
        flexDirection: 'column',
        position: 'absolute',
        zIndex: '1000',
        padding: '14px',
        boxSizing: 'border-box',
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
        fontSize: '12px',
        background: 'linear-gradient(145deg, rgba(5, 10, 8, 0.98), rgba(1, 22, 16, 0.96))',
        color: '#d7ffe9',
        border: '1px solid rgba(40, 255, 138, 0.65)',
        borderRadius: '8px',
        boxShadow:
            '0 18px 48px rgba(0, 0, 0, 0.55), 0 0 28px rgba(38, 255, 132, 0.28), inset 0 0 24px rgba(22, 255, 113, 0.08)',
        backdropFilter: 'blur(10px)',
        gap: '10px',
    });

    const noteEditorHeader = document.createElement('div');
    Object.assign(noteEditorHeader.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        color: '#37ff8b',
        textTransform: 'uppercase',
        letterSpacing: '0',
        fontWeight: '700',
    });

    const noteEditorTitle = document.createElement('span');
    noteEditorTitle.textContent = '> rabbit_note';

    const noteEditorStatus = document.createElement('span');
    noteEditorStatus.textContent = 'armed';
    Object.assign(noteEditorStatus.style, {
        padding: '3px 7px',
        color: '#051008',
        backgroundColor: '#37ff8b',
        borderRadius: '4px',
        fontSize: '10px',
        boxShadow: '0 0 14px rgba(55, 255, 139, 0.6)',
    });

    noteEditorHeader.appendChild(noteEditorTitle);
    noteEditorHeader.appendChild(noteEditorStatus);

    const noteEditorDivider = document.createElement('div');
    Object.assign(noteEditorDivider.style, {
        height: '1px',
        background: 'linear-gradient(90deg, rgba(55, 255, 139, 0.95), rgba(55, 255, 139, 0.05))',
    });

    const noteEditorSelectedText = document.createElement('p');
    noteEditorSelectedText.textContent = selectedText;
    Object.assign(noteEditorSelectedText.style, {
        maxHeight: '96px',
        margin: '0',
        padding: '10px',
        overflow: 'auto',
        color: '#a8f7c2',
        lineHeight: '1.45',
        backgroundColor: 'rgba(3, 18, 12, 0.88)',
        border: '1px solid rgba(55, 255, 139, 0.25)',
        borderRadius: '6px',
        boxShadow: 'inset 0 0 18px rgba(55, 255, 139, 0.08)',
    });

    const noteEditorTextarea = document.createElement('textarea');
    Object.assign(noteEditorTextarea.style, {
        width: '100%',
        minHeight: '132px',
        margin: '0',
        padding: '10px',
        boxSizing: 'border-box',
        resize: 'vertical',
        color: '#eafff1',
        caretColor: '#37ff8b',
        backgroundColor: 'rgba(0, 0, 0, 0.58)',
        border: '1px solid rgba(55, 255, 139, 0.55)',
        borderRadius: '6px',
        outline: 'none',
        lineHeight: '1.45',
        font: 'inherit',
        boxShadow: 'inset 0 0 16px rgba(55, 255, 139, 0.1)',
    });
    noteEditorTextarea.placeholder = 'note://';
    noteEditorTextarea.rows = 10;

    noteEditorTextarea.addEventListener('focus', () => {
        noteEditorTextarea.style.borderColor = '#37ff8b';
        noteEditorTextarea.style.boxShadow =
            '0 0 18px rgba(55, 255, 139, 0.26), inset 0 0 16px rgba(55, 255, 139, 0.12)';
    });

    noteEditorTextarea.addEventListener('blur', () => {
        noteEditorTextarea.style.borderColor = 'rgba(55, 255, 139, 0.55)';
        noteEditorTextarea.style.boxShadow = 'inset 0 0 16px rgba(55, 255, 139, 0.1)';
    });

    const noteEditorActions = document.createElement('div');
    Object.assign(noteEditorActions.style, {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
    });

    const noteEditorSubmitButton = document.createElement('button');
    noteEditorSubmitButton.textContent = 'Save';
    Object.assign(noteEditorSubmitButton.style, {
        width: '100%',
        padding: '9px 12px',
        color: '#06130b',
        backgroundColor: '#37ff8b',
        border: '1px solid #37ff8b',
        borderRadius: '6px',
        cursor: 'pointer',
        font: 'inherit',
        fontWeight: '700',
        textTransform: 'uppercase',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        boxShadow: '0 0 18px rgba(55, 255, 139, 0.34)',
    });
    noteEditorSubmitButton.addEventListener('click', () => {
        addNewOtherSiteBookmark(selectedText, noteEditorTextarea.value);
        closeNoteEditor();
    });

    const noteEditorCancelButton = document.createElement('button');
    noteEditorCancelButton.textContent = 'Cancel';
    Object.assign(noteEditorCancelButton.style, {
        width: '100%',
        padding: '9px 12px',
        color: '#ff6f91',
        backgroundColor: 'rgba(255, 111, 145, 0.08)',
        border: '1px solid rgba(255, 111, 145, 0.55)',
        borderRadius: '6px',
        cursor: 'pointer',
        font: 'inherit',
        fontWeight: '700',
        textTransform: 'uppercase',
        transition: 'background-color 120ms ease',
    });
    noteEditorCancelButton.addEventListener('click', closeNoteEditor);

    noteEditorSubmitButton.addEventListener('mouseenter', () => {
        noteEditorSubmitButton.style.transform = 'translateY(-1px)';
        noteEditorSubmitButton.style.boxShadow = '0 0 26px rgba(55, 255, 139, 0.56)';
    });

    noteEditorSubmitButton.addEventListener('mouseleave', () => {
        noteEditorSubmitButton.style.transform = 'translateY(0)';
        noteEditorSubmitButton.style.boxShadow = '0 0 18px rgba(55, 255, 139, 0.34)';
    });

    noteEditorCancelButton.addEventListener('mouseenter', () => {
        noteEditorCancelButton.style.backgroundColor = 'rgba(255, 111, 145, 0.16)';
    });

    noteEditorCancelButton.addEventListener('mouseleave', () => {
        noteEditorCancelButton.style.backgroundColor = 'rgba(255, 111, 145, 0.08)';
    });

    noteEditor.addEventListener('keydown', (event) => {
        if (event.shiftKey && event.key === 'Enter') {
            addNewOtherSiteBookmark(selectedText, noteEditorTextarea.value);
            closeNoteEditor();
        }
    });

    const selection = document.getSelection();

    if (selection && selection.rangeCount > 0) {
        const popupWidth = 360;
        const viewportMargin = 16;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const targetLeft = rect.left + window.scrollX + rect.width / 2 - popupWidth / 2;
        const minLeft = window.scrollX + viewportMargin;
        const maxLeft = Math.max(minLeft, window.scrollX + window.innerWidth - popupWidth - viewportMargin);
        const topPosition = Math.max(window.scrollY + viewportMargin, rect.top + window.scrollY - 260);
        const leftPosition = Math.min(Math.max(targetLeft, minLeft), maxLeft);

        noteEditor.style.top = `${topPosition}px`;
        noteEditor.style.left = `${leftPosition}px`;

        noteEditor.appendChild(noteEditorHeader);
        noteEditor.appendChild(noteEditorDivider);
        noteEditor.appendChild(noteEditorSelectedText);
        noteEditorTextarea.autofocus = true;
        noteEditor.appendChild(noteEditorTextarea);
        noteEditorActions.appendChild(noteEditorSubmitButton);
        noteEditorActions.appendChild(noteEditorCancelButton);
        noteEditor.appendChild(noteEditorActions);

        document.body.appendChild(noteEditor);
        noteEditorTextarea.focus();

        closePopupOnOutsideClick = (event: MouseEvent) => {
            if (!noteEditor.contains(event.target as HTMLElement)) {
                closeNoteEditor();
            }
        };

        document.addEventListener('click', closePopupOnOutsideClick);
    }
};
