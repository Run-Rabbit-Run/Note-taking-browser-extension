export const createNoteEditorPopup = (
    selectedText: string,
    addNewOtherSiteBookmark: (selectedText: string, noteText: string) => void,
) => {
    const noteEditor = document.createElement('div');
    noteEditor.style.display = 'flex';
    noteEditor.style.width = '320px';
    noteEditor.style.flexDirection = 'column';
    noteEditor.style.position = 'absolute';
    noteEditor.style.zIndex = '1000';
    noteEditor.style.padding = '8px';
    noteEditor.style.fontSize = '12px';
    noteEditor.style.backgroundColor = '#008076';
    noteEditor.style.color = '#0000EB';

    const noteEditorSelectedText = document.createElement('p');
    noteEditorSelectedText.textContent = selectedText;

    const noteEditorTextarea = document.createElement('textarea');
    noteEditorTextarea.style.backgroundColor = '#00FF00';
    noteEditorTextarea.style.color = '#006094';
    noteEditorTextarea.style.marginBottom = '10px';
    noteEditorTextarea.style.padding = '2px';
    noteEditorTextarea.rows = 10;

    const noteEditorSubmitButton = document.createElement('button');
    noteEditorSubmitButton.textContent = 'Save';
    noteEditorSubmitButton.style.width = '100%';
    noteEditorSubmitButton.addEventListener('click', () => {
        addNewOtherSiteBookmark(selectedText, noteEditorTextarea.value);
        noteEditor.remove();
    });

    const noteEditorCancelButton = document.createElement('button');
    noteEditorCancelButton.textContent = 'Cancel';
    noteEditorCancelButton.style.width = '100%';
    noteEditorCancelButton.addEventListener('click', () => {
        noteEditor.remove();
    });

    noteEditor.addEventListener('keydown', (event) => {
        if (event.shiftKey && event.key === 'Enter') {
            addNewOtherSiteBookmark(selectedText, noteEditorTextarea.value);
            noteEditor.remove();
        }
    });

    const selection = document.getSelection();

    if (selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const topPosition = rect.top + window.scrollY - 200;
        const leftPosition = rect.left + window.scrollX + (rect.width / 2);
        noteEditor.style.top = `${topPosition}px`;
        noteEditor.style.left = `${leftPosition}px`;

        noteEditor.appendChild(noteEditorSelectedText);
        noteEditorTextarea.autofocus = true;
        noteEditor.appendChild(noteEditorTextarea);
        noteEditor.appendChild(noteEditorSubmitButton);
        noteEditor.appendChild(noteEditorCancelButton);

        document.body.appendChild(noteEditor);

        // Обработчик для закрытия попапа при клике вне его
        const closePopupOnOutsideClick = (event: MouseEvent) => {
            if (!noteEditor.contains(event.target as HTMLElement)) {
                noteEditor.remove();  // Удалить попап
                document.removeEventListener('click', closePopupOnOutsideClick);  // Удалить обработчик после закрытия
            }
        };

        // Добавляем обработчик на клик документа
        document.addEventListener('click', closePopupOnOutsideClick);
    }
};
