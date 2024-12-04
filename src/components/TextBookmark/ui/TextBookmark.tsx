import cls from './TextBookmark.module.scss';
import { OtherSiteBookmarkType } from '../../../types/types.ts';
import DeleteIcon from '../../../assets/delete.svg?react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

export interface TextBookmarkProps {
    bookmark: OtherSiteBookmarkType;
    onEdit: (bookmark: OtherSiteBookmarkType) => void;
    onDelete: (bookmark: OtherSiteBookmarkType) => void;
}

const TextBookmark = ({ bookmark, onEdit, onDelete }: TextBookmarkProps) => {
    const selectedTextRef = useRef<HTMLTextAreaElement>(null);
    const noteTextRef = useRef<HTMLTextAreaElement>(null);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [noteText, setNoteText] = useState<string>(bookmark.noteText);

    const resizeTextarea = (textareaElement: HTMLTextAreaElement) => {
        textareaElement.style.height = '0px';
        textareaElement.style.height = `${textareaElement.scrollHeight + 6}px`;
    };

    const resizeTextareaOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        resizeTextarea(e.currentTarget);
    };

    const onNoteTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setNoteText(e.target.value);
        resizeTextareaOnChange(e);
    };

    const changeEditableStatus = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        setIsEdit(!isEdit);

        if (noteTextRef && noteTextRef.current) {
            noteTextRef.current.focus();
            return false;
        }
    };

    const onSubmit = () => {
        const newBookmark = {
            ...bookmark,
            noteText,
        };

        onEdit(newBookmark);
        setIsEdit(false);
    };

    const onEnterClick = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            onSubmit();
        }
    };

    useEffect(() => {
        if (selectedTextRef && selectedTextRef.current) {
            resizeTextarea(selectedTextRef.current);
        }

        if (noteTextRef && noteTextRef.current) {
            resizeTextarea(noteTextRef.current);
        }

        document.addEventListener('keypress', onEnterClick);

        return () => {
            document.removeEventListener('keypress', onEnterClick);
        };
    }, []);

    return (
        <div key={`rabbit-bookmark-${bookmark.selectedText}`} className={cls.otherBookmark}>
            <div className={cls.floatingButtons}>
                <button className={cls.button} onClick={changeEditableStatus}>
                    Edit
                </button>
                <button className={cls.button} onClick={() => onDelete(bookmark)}>
                    <DeleteIcon className={cls.icon} />
                </button>
            </div>
            <textarea ref={selectedTextRef} disabled name={'selectedText'} className={cls.selectedText} onChange={resizeTextareaOnChange} value={bookmark.selectedText} />
            <textarea ref={noteTextRef} disabled={!isEdit} name={'noteText'} className={cls.noteText} onChange={onNoteTextChange} value={noteText} autoFocus />
            {isEdit && <button className={cls.saveButton} onClick={onSubmit}>Save</button>}
        </div>
    );
};

export default TextBookmark;
