export type VideoBookmarkType = {
    time: number,
    desc: string,
    pageUrl: string,
    pageTitle: string,
}

export interface OtherSiteBookmarkType {
    selectedText: string,
    noteText: string,
    pageUrl: string,
    pageTitle: string,
}

export type BookmarkType = VideoBookmarkType | OtherSiteBookmarkType;


