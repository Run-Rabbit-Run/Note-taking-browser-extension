import cls from './TextBookmark.module.scss';
import { OtherSiteBookmarkType } from '../../../types/types.ts';
import DeleteIcon from '../../../assets/delete.svg?react';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(target.closest('textarea, input, select, [contenteditable="true"]'));
};

export interface TextBookmarkProps {
    bookmark: OtherSiteBookmarkType;
    onEdit?: (bookmark: OtherSiteBookmarkType) => void;
    onDelete?: (bookmark: OtherSiteBookmarkType) => void;
    onOpen?: (bookmark: OtherSiteBookmarkType) => void;
}

const TextBookmark = ({ bookmark, onEdit, onDelete, onOpen }: TextBookmarkProps) => {
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
        e.stopPropagation();

        setIsEdit(!isEdit);

        if (noteTextRef && noteTextRef.current) {
            noteTextRef.current.focus();
        }
    };

    const onSubmit = useCallback(() => {
        if (!onEdit) return;

        const newBookmark = {
            ...bookmark,
            noteText,
        };

        onEdit(newBookmark);
        setIsEdit(false);
    }, [bookmark, onEdit, noteText]);

    const onOpenBookmark = useCallback(() => {
        if (isEdit || !onOpen) return;

        onOpen(bookmark);
    }, [bookmark, isEdit, onOpen]);

    const onBookmarkKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onOpen || isEditableTarget(e.target)) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;

        e.preventDefault();
        onOpenBookmark();
    };

    const onEnterClick = useCallback((e: KeyboardEvent) => {
        if (isEdit && e.key === 'Enter' && !e.shiftKey) {
            onSubmit();
        }
    }, [isEdit, onSubmit]);

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
    }, [bookmark, noteText, onEnterClick]);

    const bookmarkClassName = onOpen ? `${cls.otherBookmark} ${cls.otherBookmarkClickable}` : cls.otherBookmark;
    const noteTextClassName = isEdit ? `${cls.noteText} ${cls.noteTextEditing}` : cls.noteText;

    return (
        <div
            key={`rabbit-bookmark-${bookmark.selectedText}`}
            className={bookmarkClassName}
            onClick={onOpenBookmark}
            onKeyDown={onBookmarkKeyDown}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
        >
            <div className={cls.floatingButtons}>
                {onEdit &&
                    <button className={cls.button} onClick={changeEditableStatus}>
                        Edit
                    </button>
                }
                {onDelete &&
                    <button
                        className={cls.button}
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete(bookmark);
                        }}
                    >
                        <DeleteIcon className={cls.icon} />
                    </button>
                }
            </div>
            <textarea
                ref={selectedTextRef}
                readOnly
                name={'selectedText'}
                className={cls.selectedText}
                onChange={resizeTextareaOnChange}
                value={bookmark.selectedText}
            />
            <textarea
                ref={noteTextRef}
                readOnly={!isEdit}
                name={'noteText'}
                className={noteTextClassName}
                onChange={onNoteTextChange}
                value={noteText}
                autoFocus
            />
            {isEdit &&
                <button
                    className={cls.saveButton}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSubmit();
                    }}
                >
                    Save
                </button>
            }
        </div>
    );
};

export default TextBookmark;
