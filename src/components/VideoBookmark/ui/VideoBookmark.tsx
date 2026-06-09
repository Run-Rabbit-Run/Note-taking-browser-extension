import cls from './VideoBookmark.module.scss';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import PlayVideoIcon from '../../../assets/play_video.svg?react';
import DeleteIcon from '../../../assets/delete.svg?react';
import EditIcon from '../../../assets/edit.svg?react';
import { VideoBookmarkType } from '../../../types/types.ts';

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(target.closest('textarea, input, select, [contenteditable="true"]'));
};

interface VideoBookmarkProps {
    bookmark: VideoBookmarkType;
    onEditBookmark?: (bookmark: VideoBookmarkType) => void;
    onOpenBookmark?: (bookmark: VideoBookmarkType) => void;
    onPlayBookmark?: (bookmark: VideoBookmarkType) => void;
    onDeleteBookmark?: (bookmark: VideoBookmarkType) => void;
}

const VideoBookmark = ({
    bookmark,
    onEditBookmark,
    onOpenBookmark,
    onPlayBookmark,
    onDeleteBookmark,
}: VideoBookmarkProps) => {
    const noteTextRef = useRef<HTMLTextAreaElement>(null);
    const [isEdit, setIsEdit] = useState(false);
    const [noteText, setNoteText] = useState(bookmark.noteText || '');

    const resizeTextarea = (textareaElement: HTMLTextAreaElement) => {
        textareaElement.style.height = '0px';
        textareaElement.style.height = `${textareaElement.scrollHeight + 6}px`;
    };

    const onNoteTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setNoteText(event.target.value);
        resizeTextarea(event.currentTarget);
    };

    const onToggleEdit = () => {
        if (!isEdit) {
            setNoteText(bookmark.noteText || '');
        }

        setIsEdit((currentValue) => !currentValue);
    };

    const onSubmit = useCallback(() => {
        if (!onEditBookmark) return;

        onEditBookmark({
            ...bookmark,
            noteText,
        });
        setIsEdit(false);
    }, [bookmark, noteText, onEditBookmark]);

    const onOpen = useCallback(() => {
        if (isEdit || !onOpenBookmark) return;

        onOpenBookmark(bookmark);
    }, [bookmark, isEdit, onOpenBookmark]);

    const onBookmarkKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onOpenBookmark || isEditableTarget(event.target)) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        onOpen();
    };

    useEffect(() => {
        setNoteText(bookmark.noteText || '');
    }, [bookmark.noteText]);

    useEffect(() => {
        if (isEdit && noteTextRef.current) {
            noteTextRef.current.focus();
            resizeTextarea(noteTextRef.current);
        }
    }, [isEdit]);

    const bookmarkNoteText = bookmark.noteText || '';
    const isShowNote = bookmarkNoteText.trim().length > 0 && !isEdit;
    const bookmarkClassName = onOpenBookmark
        ? `${cls.videoBookmark} ${cls.videoBookmarkClickable}`
        : cls.videoBookmark;

    return (
        <div
            key={`rabbit-bookmark-${bookmark.time}`}
            className={bookmarkClassName}
            onClick={onOpen}
            onKeyDown={onBookmarkKeyDown}
            role={onOpenBookmark ? 'button' : undefined}
            tabIndex={onOpenBookmark ? 0 : undefined}
        >
            <div className={cls.bookmarkHeader}>
                <p className={cls.timestamp}>
                    {bookmark.desc} - {bookmark.time}
                </p>
                <div className={cls.buttonWrapper}>
                    {onEditBookmark &&
                        <button
                            className={cls.button}
                            title="Edit note"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleEdit();
                            }}
                        >
                            <EditIcon className={cls.icon} />
                        </button>
                    }
                    {onPlayBookmark &&
                        <button
                            className={cls.button}
                            title="Play timestamp"
                            onClick={(event) => {
                                event.stopPropagation();
                                onPlayBookmark(bookmark);
                            }}
                        >
                            <PlayVideoIcon className={cls.icon} />
                        </button>
                    }
                    {onDeleteBookmark &&
                        <button
                            className={cls.button}
                            title="Delete timestamp"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDeleteBookmark(bookmark);
                            }}
                        >
                            <DeleteIcon className={cls.icon} />
                        </button>
                    }
                </div>
            </div>
            {isShowNote && <p className={cls.noteText}>{bookmarkNoteText}</p>}
            {isEdit &&
                <div className={cls.noteEditor}>
                    <textarea
                        ref={noteTextRef}
                        className={cls.noteTextarea}
                        name="videoNoteText"
                        placeholder="Add note to this timestamp"
                        onChange={onNoteTextChange}
                        value={noteText}
                    />
                    <button
                        className={cls.saveButton}
                        onClick={(event) => {
                            event.stopPropagation();
                            onSubmit();
                        }}
                    >
                        Save note
                    </button>
                </div>
            }
        </div>
    );
};

export default VideoBookmark;
