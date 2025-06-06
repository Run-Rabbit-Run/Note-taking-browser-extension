import { BookmarkType, OtherSiteBookmarkType, VideoBookmarkType } from '../types/types.ts';

export const isVideoBookmark = (bookmark: BookmarkType): bookmark is VideoBookmarkType => "time" in bookmark;

export const isOtherSiteBookmark = (bookmark: BookmarkType): bookmark is OtherSiteBookmarkType => "selectedText" in bookmark;

export const isOtherSiteBookmarks = (bookmarks: BookmarkType[]): bookmarks is OtherSiteBookmarkType[] => {
    return bookmarks.every((bookmark) => isOtherSiteBookmark(bookmark));
};
