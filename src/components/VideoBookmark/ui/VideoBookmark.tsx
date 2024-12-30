import cls from './VideoBookmark.module.scss';
import PlayVideoIcon from '../../../assets/play_video.svg?react';
import DeleteIcon from '../../../assets/delete.svg?react';
import { VideoBookmarkType } from '../../../types/types.ts';

interface VideoBookmarkProps {
    bookmark: VideoBookmarkType;
    onPlayBookmark?: (bookmark: VideoBookmarkType) => void;
    onDeleteBookmark?: (bookmark: VideoBookmarkType) => void;
}

const VideoBookmark = ({ bookmark, onPlayBookmark, onDeleteBookmark }: VideoBookmarkProps) => {

    return (
        <div key={`rabbit-bookmark-${bookmark.time}`} className={cls.videoBookmark}>
            <p>
                {bookmark.desc} - {bookmark.time}
            </p>
            <div className={cls.buttonWrapper}>
                {onPlayBookmark &&
                    <button className={cls.button} onClick={() => onPlayBookmark(bookmark)}>
                        <PlayVideoIcon className={cls.icon} />
                    </button>
                }
                {onDeleteBookmark &&
                    <button className={cls.button} onClick={() => onDeleteBookmark(bookmark)}>
                        <DeleteIcon className={cls.icon} />
                    </button>
                }
            </div>
        </div>
    );
};

export default VideoBookmark;
