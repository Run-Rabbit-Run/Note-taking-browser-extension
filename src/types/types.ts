export type VideoBookmarkType = {
    time: number,
    desc: string,
}

export interface OtherSiteBookmarkType {
    selectedText: string,
    noteText: string,
}

export type BookmarkType = VideoBookmarkType | OtherSiteBookmarkType;


