export type VideoBookmarkType = {
    time: number,
    desc: string,
    noteText: string,
    pageUrl: string,
    pageTitle: string,
}

export interface OtherSiteBookmarkType {
    selectedText: string,
    selectedTextPosition?: number,
    noteText: string,
    pageUrl: string,
    pageTitle: string,
}

export type BookmarkType = VideoBookmarkType | OtherSiteBookmarkType;


