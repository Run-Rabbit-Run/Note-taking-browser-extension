export type VideoBookmarkType = {
    time: number,
    desc: string,
}

export type OtherSiteBookmarkType = {
    selectedText: string,
    noteText: string,
}

export type BookmarkType = VideoBookmarkType | OtherSiteBookmarkType;


